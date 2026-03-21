"""
Inventory views.
Product list with low-stock highlighting, add product, and restock quick action.
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(ModelViewSet):
    """
    Product CRUD with low-stock filtering.
    GET /api/inventory/?low_stock=true — only low-stock items
    PATCH /api/inventory/{id}/ — restock: pass quantity_in_stock
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all()
        low_stock = self.request.query_params.get('low_stock')
        if low_stock and low_stock.lower() == 'true':
            # Filter products where stock is at or below reorder level
            from django.db.models import F
            qs = qs.filter(quantity_in_stock__lte=F('reorder_level'))
        return qs

    def list(self, request, *args, **kwargs):
        try:
            qs = self.get_queryset()
            serializer = ProductSerializer(qs, many=True)
            # Count low-stock items for dashboard banner
            from django.db.models import F
            low_count = Product.objects.filter(quantity_in_stock__lte=F('reorder_level')).count()
            return Response({'success': True, 'data': serializer.data, 'low_stock_count': low_count})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def create(self, request, *args, **kwargs):
        try:
            serializer = ProductSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            product = serializer.save()
            return Response({'success': True, 'data': ProductSerializer(product).data, 'message': 'Product added'}, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)

    def partial_update(self, request, *args, **kwargs):
        """PATCH — typically used for restock: update quantity_in_stock."""
        try:
            product = self.get_object()
            serializer = ProductSerializer(product, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            # Update last_restocked date if quantity changed
            if 'quantity_in_stock' in request.data:
                from django.utils.timezone import localdate
                product.last_restocked = localdate()
            serializer.save()
            return Response({'success': True, 'data': serializer.data, 'message': 'Updated'})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class ProductTransactionHistoryView(APIView):
    """GET /api/inventory/{id}/transactions/?page=1"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            from .models import InventoryTransaction
            from .serializers import InventoryTransactionSerializer
            product = Product.objects.get(pk=pk)
            qs = InventoryTransaction.objects.filter(product=product).select_related('performed_by')
            page = int(request.query_params.get('page', 1))
            per_page = 20
            start = (page - 1) * per_page
            end = start + per_page
            serializer = InventoryTransactionSerializer(qs[start:end], many=True)
            return Response({'success': True, 'data': serializer.data, 'total': qs.count(), 'page': page})
        except Product.DoesNotExist:
            return Response({'success': False, 'message': 'Product not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class RestockProductView(APIView):
    """POST /api/inventory/{id}/restock/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            from .models import InventoryTransaction
            from .serializers import ProductSerializer
            from django.utils.timezone import localdate
            product = Product.objects.get(pk=pk)
            quantity = request.data.get('quantity')
            unit_cost = request.data.get('unit_cost')
            notes = request.data.get('notes', '')

            if not quantity or float(quantity) <= 0:
                return Response({'success': False, 'message': 'quantity must be positive'}, status=400)

            from decimal import Decimal
            qty = Decimal(str(quantity))
            qty_before = product.quantity_in_stock
            qty_after = qty_before + qty
            uc = Decimal(str(unit_cost)) if unit_cost else None
            tc = qty * uc if uc else None

            InventoryTransaction.objects.create(
                product=product,
                transaction_type='restock',
                quantity_change=qty,
                quantity_before=qty_before,
                quantity_after=qty_after,
                unit_cost=uc,
                total_cost=tc,
                notes=notes,
                performed_by=request.user,
            )

            product.last_restocked = localdate()
            if unit_cost:
                product.cost_price = uc
            # quantity_in_stock updated by signal
            product.refresh_from_db()

            return Response({'success': True, 'data': ProductSerializer(product).data,
                             'message': f'Restocked {qty} {product.unit}. New stock: {product.quantity_in_stock}'})
        except Product.DoesNotExist:
            return Response({'success': False, 'message': 'Product not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class AdjustProductView(APIView):
    """POST /api/inventory/{id}/adjust/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            from .models import InventoryTransaction
            from .serializers import ProductSerializer
            product = Product.objects.get(pk=pk)
            quantity_change = request.data.get('quantity_change')
            transaction_type = request.data.get('transaction_type', 'adjustment')
            notes = request.data.get('notes', '')

            if quantity_change is None:
                return Response({'success': False, 'message': 'quantity_change required'}, status=400)
            if transaction_type not in ('wastage', 'adjustment', 'return'):
                return Response({'success': False, 'message': 'Invalid transaction_type'}, status=400)

            from decimal import Decimal
            qty_change = Decimal(str(quantity_change))
            qty_before = product.quantity_in_stock
            qty_after = qty_before + qty_change

            InventoryTransaction.objects.create(
                product=product,
                transaction_type=transaction_type,
                quantity_change=qty_change,
                quantity_before=qty_before,
                quantity_after=qty_after,
                notes=notes,
                performed_by=request.user,
            )

            product.refresh_from_db()
            return Response({'success': True, 'data': ProductSerializer(product).data,
                             'message': f'Adjustment recorded. New stock: {product.quantity_in_stock}'})
        except Product.DoesNotExist:
            return Response({'success': False, 'message': 'Product not found'}, status=404)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class LowStockAlertsView(APIView):
    """GET /api/inventory/low-stock-alerts/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from django.db.models import F
            products = Product.objects.filter(quantity_in_stock__lte=F('reorder_level'))
            data = [{
                'id': p.id,
                'name': p.name,
                'brand': p.brand,
                'category': p.category,
                'current_stock': float(p.quantity_in_stock),
                'reorder_level': float(p.reorder_level),
                'units_short': float(p.reorder_level - p.quantity_in_stock),
                'unit': p.unit,
                'last_restocked': str(p.last_restocked) if p.last_restocked else None,
                'supplier_name': p.supplier_name,
            } for p in products]
            return Response({'success': True, 'data': data, 'count': len(data)})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


class ServiceProductUsageView(APIView):
    """GET/POST /api/inventory/service-product-usages/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .models import ServiceProductUsage
            service_id = request.query_params.get('service_id')
            qs = ServiceProductUsage.objects.select_related('service', 'product')
            if service_id:
                qs = qs.filter(service_id=service_id)
            data = [{
                'id': u.id,
                'service_id': u.service_id,
                'service_name': u.service.name,
                'product_id': u.product_id,
                'product_name': u.product.name,
                'quantity_used': float(u.quantity_used),
                'unit': u.unit,
                'notes': u.notes,
            } for u in qs]
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)

    def post(self, request):
        try:
            from .models import ServiceProductUsage
            from apps.services.models import Service
            service = Service.objects.get(pk=request.data['service_id'])
            product = Product.objects.get(pk=request.data['product_id'])
            from decimal import Decimal
            usage, created = ServiceProductUsage.objects.get_or_create(
                service=service, product=product,
                defaults={
                    'quantity_used': Decimal(str(request.data['quantity_used'])),
                    'unit': request.data.get('unit', product.unit),
                    'notes': request.data.get('notes', ''),
                }
            )
            if not created:
                usage.quantity_used = Decimal(str(request.data['quantity_used']))
                usage.unit = request.data.get('unit', product.unit)
                usage.notes = request.data.get('notes', '')
                usage.save()
            return Response({'success': True, 'message': 'Mapping saved', 'data': {
                'id': usage.id, 'service_name': service.name,
                'product_name': product.name, 'quantity_used': float(usage.quantity_used), 'unit': usage.unit
            }}, status=201)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)


class ServiceProductUsageDetailView(APIView):
    """DELETE /api/inventory/service-product-usages/{id}/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            from .models import ServiceProductUsage
            usage = ServiceProductUsage.objects.get(pk=pk)
            usage.delete()
            return Response({'success': True, 'message': 'Mapping deleted'})
        except ServiceProductUsage.DoesNotExist:
            return Response({'success': False, 'message': 'Not found'}, status=404)


class ConsumptionReportView(APIView):
    """GET /api/inventory/consumption-report/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from .models import InventoryTransaction
            from django.db.models import Sum, Count
            from datetime import date, timedelta
            today = date.today()
            start = request.query_params.get('start_date', (today - timedelta(days=30)).strftime('%Y-%m-%d'))
            end = request.query_params.get('end_date', today.strftime('%Y-%m-%d'))

            transactions = InventoryTransaction.objects.filter(
                transaction_type='usage',
                created_at__date__gte=start,
                created_at__date__lte=end,
            ).select_related('product', 'reference_invoice')

            product_map = {}
            for t in transactions:
                pid = t.product_id
                if pid not in product_map:
                    product_map[pid] = {
                        'product_id': pid,
                        'product_name': t.product.name,
                        'unit': t.product.unit,
                        'total_consumed': 0,
                        'estimated_cost': 0,
                        'transaction_count': 0,
                    }
                product_map[pid]['total_consumed'] += float(abs(t.quantity_change))
                if t.unit_cost:
                    product_map[pid]['estimated_cost'] += float(abs(t.quantity_change) * t.unit_cost)
                product_map[pid]['transaction_count'] += 1

            data = sorted(product_map.values(), key=lambda x: x['total_consumed'], reverse=True)
            return Response({'success': True, 'data': data, 'period': {'start': start, 'end': end}})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
