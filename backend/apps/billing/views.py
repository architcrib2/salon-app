"""
Billing views.
Handles invoice generation from appointments with GST calculation,
loyalty points management, and daily revenue summaries.
"""
from datetime import datetime, date
from decimal import Decimal

import pytz
from django.db.models import Sum, Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from .models import Invoice, InvoiceItem
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    InvoiceListSerializer,
)
from apps.appointments.models import Appointment

IST = pytz.timezone('Asia/Kolkata')


def _deduct_inventory_for_invoice(invoice, performed_by):
    """Auto-deduct inventory products based on ServiceProductUsage mappings."""
    try:
        from apps.inventory.models import ServiceProductUsage, InventoryTransaction
    except ImportError:
        return  # Inventory transaction model not yet available

    for item in invoice.items.select_related('service', 'stylist').all():
        usages = ServiceProductUsage.objects.filter(service=item.service).select_related('product')
        for usage in usages:
            product = usage.product
            qty_before = product.quantity_in_stock
            qty_change = -usage.quantity_used
            qty_after = qty_before + qty_change
            warning = ''
            if qty_after < 0:
                warning = f' [WARNING: stock went below 0 — now {qty_after} {product.unit}]'
            InventoryTransaction.objects.create(
                product=product,
                transaction_type='usage',
                quantity_change=qty_change,
                quantity_before=qty_before,
                quantity_after=qty_after,
                reference_invoice=invoice,
                performed_by=item.stylist,
                notes=f'Auto-deducted for service: {item.service.name}{warning}',
            )
            # Update cached quantity
            product.quantity_in_stock = qty_after
            product.save(update_fields=['quantity_in_stock'])


def generate_invoice_number():
    """
    Auto-generate invoice number in format INV-YYYYMM-XXXX.
    XXXX is zero-padded sequential number within the month.
    """
    now = datetime.now()
    prefix = f"INV-{now.strftime('%Y%m')}-"
    # Count invoices this month to determine next sequence number
    count = Invoice.objects.filter(invoice_number__startswith=prefix).count()
    return f"{prefix}{str(count + 1).zfill(4)}"


class InvoiceViewSet(ViewSet):
    """
    Invoice CRUD with daily summary.
    POST /api/billing/invoices/ — generate invoice from appointment
    GET  /api/billing/invoices/ — list with date range / payment method filters
    GET  /api/billing/invoices/{id}/ — detail
    GET  /api/billing/daily-summary/?date=YYYY-MM-DD — revenue breakdown
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """GET /api/billing/invoices/ — filter by date_from, date_to, payment_method."""
        try:
            qs = Invoice.objects.select_related('customer').all()
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            payment_method = request.query_params.get('payment_method')

            if date_from:
                qs = qs.filter(created_at__date__gte=date_from)
            if date_to:
                qs = qs.filter(created_at__date__lte=date_to)
            if payment_method:
                qs = qs.filter(payment_method=payment_method)

            serializer = InvoiceListSerializer(qs, many=True)
            return Response({'success': True, 'data': serializer.data, 'count': qs.count()})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def retrieve(self, request, pk=None):
        """GET /api/billing/invoices/{id}/ — full invoice detail with line items."""
        try:
            invoice = Invoice.objects.prefetch_related('items').get(pk=pk)
            serializer = InvoiceDetailSerializer(invoice)
            return Response({'success': True, 'data': serializer.data})
        except Invoice.DoesNotExist:
            return Response({'success': False, 'message': 'Invoice not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def create(self, request):
        try:
            from django.utils import timezone as tz
            from apps.customers.models import Customer
            from apps.services.models import Service
            from apps.accounts.models import StaffMember

            data = request.data
            payment_method = data.get('payment_method')
            if not payment_method:
                return Response({'success': False, 'message': 'payment_method is required'}, status=400)

            discount = Decimal(str(data.get('discount_amount', '0')))
            loyalty_pts = int(data.get('loyalty_points_used', 0))
            tip = Decimal(str(data.get('tip_amount', '0')))
            notes = data.get('notes', '')

            if data.get('appointment_id'):
                # ── MODE A: Appointment-based (existing behaviour) ──────────────
                appointment = Appointment.objects.prefetch_related('services').get(pk=data['appointment_id'])

                subtotal = Decimal('0.00')
                for service in appointment.services.all():
                    subtotal += service.price

                gst_total = Decimal('0.00')
                line_items = []
                for service in appointment.services.all():
                    item_gst = (service.price * service.gst_rate / 100).quantize(Decimal('0.01'))
                    gst_total += item_gst
                    line_items.append({
                        'service': service,
                        'stylist': appointment.stylist,
                        'price': service.price,
                        'gst_rate': service.gst_rate,
                        'gst_amount': item_gst,
                    })

                loyalty_discount = Decimal(loyalty_pts)
                total = max(subtotal + gst_total - discount - loyalty_discount + tip, Decimal('0'))

                invoice = Invoice.objects.create(
                    appointment=appointment,
                    invoice_number=generate_invoice_number(),
                    customer=appointment.customer,
                    subtotal=subtotal,
                    gst_amount=gst_total,
                    discount_amount=discount,
                    loyalty_points_used=loyalty_pts,
                    total_amount=total,
                    payment_method=payment_method,
                    tip_amount=tip,
                    notes=notes,
                    is_walkin=False,
                    created_at=tz.now(),
                )
                for item in line_items:
                    InvoiceItem.objects.create(invoice=invoice, **item)

                appointment.status = 'completed'
                appointment.save(update_fields=['status'])

                customer = appointment.customer
                customer.loyalty_points -= loyalty_pts
                earned = int(total / 100)
                customer.loyalty_points += earned
                from django.utils.timezone import localdate
                customer.last_visit = localdate()
                customer.save(update_fields=['loyalty_points', 'last_visit'])

            else:
                # ── MODE B: Walk-in (new) ─────────────────────────────────────
                customer_id = data.get('customer_id')
                items_data = data.get('items', [])

                if not customer_id:
                    return Response({'success': False, 'message': 'customer_id required for walk-in billing'}, status=400)
                if not items_data:
                    return Response({'success': False, 'message': 'items required for walk-in billing (min 1)'}, status=400)

                customer = Customer.objects.get(pk=customer_id)

                # Validate loyalty points
                if loyalty_pts > customer.loyalty_points:
                    return Response({'success': False, 'message': f'Customer only has {customer.loyalty_points} loyalty points'}, status=400)

                subtotal = Decimal('0.00')
                gst_total = Decimal('0.00')
                line_items = []

                for item_data in items_data:
                    service = Service.objects.get(pk=item_data['service_id'])
                    stylist = StaffMember.objects.get(pk=item_data['stylist_id'])
                    item_gst = (service.price * service.gst_rate / 100).quantize(Decimal('0.01'))
                    subtotal += service.price
                    gst_total += item_gst
                    line_items.append({
                        'service': service,
                        'stylist': stylist,
                        'price': service.price,
                        'gst_rate': service.gst_rate,
                        'gst_amount': item_gst,
                    })

                loyalty_discount = Decimal(loyalty_pts)
                total = max(subtotal + gst_total - discount - loyalty_discount + tip, Decimal('0'))

                invoice = Invoice.objects.create(
                    appointment=None,
                    invoice_number=generate_invoice_number(),
                    customer=customer,
                    subtotal=subtotal,
                    gst_amount=gst_total,
                    discount_amount=discount,
                    loyalty_points_used=loyalty_pts,
                    total_amount=total,
                    payment_method=payment_method,
                    tip_amount=tip,
                    notes=notes,
                    is_walkin=True,
                    created_at=tz.now(),
                )
                for item in line_items:
                    InvoiceItem.objects.create(invoice=invoice, **item)

                # Update customer loyalty and last visit
                from django.utils.timezone import localdate
                customer.loyalty_points -= loyalty_pts
                earned = int(total / 100)
                customer.loyalty_points += earned
                customer.last_visit = localdate()
                customer.save(update_fields=['loyalty_points', 'last_visit'])

                # Schedule REVIEW_REQUEST notification
                try:
                    from apps.notifications.models import WhatsAppNotification
                    from apps.notifications.constants import REVIEW_REQUEST
                    import datetime
                    scheduled_at = tz.now() + datetime.timedelta(hours=2)
                    msg = REVIEW_REQUEST.format(name=customer.name.split()[0], salon_name='KaratOS Salon')
                    WhatsAppNotification.objects.create(
                        customer=customer,
                        notification_type='review_request',
                        phone_number=customer.phone,
                        message_body=msg,
                        status='pending',
                        scheduled_at=scheduled_at,
                    )
                except Exception:
                    pass  # Don't fail invoice on notification error

            # Auto-deduct inventory for all invoice items
            try:
                _deduct_inventory_for_invoice(invoice, request.user)
            except Exception:
                pass  # Don't block invoice on stock deduction errors

            return Response(
                {
                    'success': True,
                    'data': InvoiceDetailSerializer(invoice).data,
                    'message': f'Invoice {invoice.invoice_number} generated.',
                },
                status=201,
            )
        except (Appointment.DoesNotExist,) as e:
            return Response({'success': False, 'message': str(e)}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class DailySummaryView(APIView):
    """
    GET /api/billing/daily-summary/?date=YYYY-MM-DD
    Returns revenue breakdown by payment method for a given day.
    Used in dashboard cards and daily closing reports.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            date_str = request.query_params.get('date', date.today().strftime('%Y-%m-%d'))
            day = datetime.strptime(date_str, '%Y-%m-%d').date()

            invoices = Invoice.objects.filter(created_at__date=day)

            # Aggregate totals by payment method
            summary = invoices.values('payment_method').annotate(
                total=Sum('total_amount'),
                count=Count('id'),
            )

            # Overall totals
            totals = invoices.aggregate(
                total_revenue=Sum('total_amount'),
                total_invoices=Count('id'),
                total_gst=Sum('gst_amount'),
            )

            return Response({
                'success': True,
                'data': {
                    'date': date_str,
                    'by_payment_method': list(summary),
                    'total_revenue': totals['total_revenue'] or 0,
                    'total_invoices': totals['total_invoices'] or 0,
                    'total_gst': totals['total_gst'] or 0,
                },
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class WalkinSummaryView(APIView):
    """GET /api/billing/invoices/walkin-summary/?date=YYYY-MM-DD"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from datetime import date
            date_str = request.query_params.get('date', date.today().strftime('%Y-%m-%d'))
            day = datetime.strptime(date_str, '%Y-%m-%d').date()

            walkin = Invoice.objects.filter(created_at__date=day, is_walkin=True)
            appt_based = Invoice.objects.filter(created_at__date=day, is_walkin=False)

            from django.db.models import Sum, Count
            return Response({'success': True, 'data': {
                'date': date_str,
                'walkin_count': walkin.count(),
                'walkin_revenue': float(walkin.aggregate(total=Sum('total_amount'))['total'] or 0),
                'appointment_based_count': appt_based.count(),
                'appointment_based_revenue': float(appt_based.aggregate(total=Sum('total_amount'))['total'] or 0),
            }})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
