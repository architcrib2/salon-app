"""
Phase 3 seed script — idempotent.
Creates:
  - 5 ServiceProductUsage mappings
  - 20 InventoryTransactions (restock + usage + adjustment)
  - 3 products set below reorder level
  - 5 walk-in invoices

Run from project root:
    source backend/venv/bin/activate
    python seed_phase3.py
"""
import os
import sys
import django
import random
from decimal import Decimal
from datetime import timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'salon_project.settings')
django.setup()

import pytz
from django.utils import timezone

from apps.inventory.models import Product, InventoryTransaction, ServiceProductUsage
from apps.services.models import Service
from apps.accounts.models import StaffMember
from apps.customers.models import Customer
from apps.billing.models import Invoice, InvoiceItem

IST = pytz.timezone('Asia/Kolkata')


def get_owner():
    owner = StaffMember.objects.filter(role='owner').first()
    if not owner:
        owner = StaffMember.objects.first()
    if not owner:
        raise RuntimeError("No staff members found. Run the main seed script first.")
    return owner


def seed_service_product_mappings():
    """Create 5 service → product usage mappings."""
    print("Seeding service-product mappings...")

    services = list(Service.objects.filter(is_active=True)[:10])
    products = list(Product.objects.all()[:10])

    if not services or not products:
        print("  Skipped: no services or products found")
        return

    # Pick up to 5 unique (service, product) pairs
    pairs = []
    seen = set()
    for s in services:
        for p in products:
            if (s.id, p.id) not in seen and len(pairs) < 5:
                if not ServiceProductUsage.objects.filter(service=s, product=p).exists():
                    pairs.append((s, p))
                    seen.add((s.id, p.id))

    created = 0
    for svc, prd in pairs:
        qty = Decimal(random.choice(['5.0', '10.0', '15.0', '20.0', '2.0', '3.5']))
        ServiceProductUsage.objects.create(
            service=svc,
            product=prd,
            quantity_used=qty,
            unit=prd.unit,
            notes=f"Auto-seeded: {qty} {prd.unit} of {prd.name} per {svc.name}",
        )
        created += 1
        print(f"  Mapped: {svc.name} → {prd.name} ({qty} {prd.unit})")

    print(f"  Created {created} service-product mappings")


def seed_inventory_transactions():
    """Create 20 InventoryTransactions (mix of restock/usage/adjustment)."""
    print("Seeding inventory transactions...")

    products = list(Product.objects.all())
    owner = get_owner()

    if not products:
        print("  Skipped: no products found")
        return

    now = timezone.now()
    created = 0

    for i in range(20):
        product = random.choice(products)
        days_ago = random.randint(0, 60)
        txn_time = now - timedelta(days=days_ago, hours=random.randint(0, 23))

        txn_type = random.choices(
            ['restock', 'usage', 'adjustment', 'wastage'],
            weights=[40, 35, 15, 10]
        )[0]

        if txn_type == 'restock':
            qty_change = Decimal(random.randint(10, 50))
        elif txn_type == 'usage':
            qty_change = Decimal(-random.randint(1, 10))
        elif txn_type == 'adjustment':
            qty_change = Decimal(random.choice([-5, -3, -2, 2, 3, 5]))
        else:  # wastage
            qty_change = Decimal(-random.randint(1, 5))

        qty_before = product.quantity_in_stock
        qty_after = qty_before + qty_change

        InventoryTransaction.objects.create(
            product=product,
            transaction_type=txn_type if txn_type != 'usage' else 'usage',
            quantity_change=qty_change,
            quantity_before=qty_before,
            quantity_after=qty_after,
            notes=f"Seeded {txn_type} transaction #{i+1}",
            performed_by=owner,
        )
        # Update the product's quantity_in_stock cache
        product.quantity_in_stock = qty_after
        product.save(update_fields=['quantity_in_stock'])

        created += 1

    print(f"  Created {created} inventory transactions")


def seed_low_stock_products():
    """Set 3 products below their reorder level."""
    print("Seeding low-stock products...")

    products = list(Product.objects.all()[:10])
    if len(products) < 3:
        print("  Skipped: not enough products")
        return

    targets = random.sample(products, 3)
    for p in targets:
        if p.quantity_in_stock > p.reorder_level:
            # Set stock to just below reorder level
            p.quantity_in_stock = max(Decimal('0'), p.reorder_level - Decimal('1'))
            p.save(update_fields=['quantity_in_stock'])
            print(f"  Low stock: {p.name} → {p.quantity_in_stock} {p.unit} (reorder at {p.reorder_level})")

    print("  3 products now below reorder level")


def seed_walkin_invoices():
    """Create 5 walk-in invoices (no linked appointment)."""
    print("Seeding walk-in invoices...")

    customers = list(Customer.objects.order_by('?')[:10])
    services = list(Service.objects.filter(is_active=True)[:10])
    owner = get_owner()

    if not customers or not services:
        print("  Skipped: need customers and services")
        return

    now = timezone.now()
    created = 0

    for i in range(5):
        customer = customers[i % len(customers)]
        selected_services = random.sample(services, random.randint(1, 3))
        payment_method = random.choice(['cash', 'upi', 'card'])
        days_ago = random.randint(0, 14)
        created_at = now - timedelta(days=days_ago, hours=random.randint(0, 10))

        # Generate unique invoice number
        ts = created_at.strftime('%Y%m')
        seq = Invoice.objects.filter(invoice_number__startswith=f'WLK-{ts}').count() + 1 + i
        invoice_number = f"WLK-{ts}-{seq:04d}"

        if Invoice.objects.filter(invoice_number=invoice_number).exists():
            invoice_number = f"WLK-{ts}-{seq+100:04d}"

        subtotal = sum(Decimal(str(s.price)) for s in selected_services)
        gst_rate = Decimal('5')
        gst_amount = (subtotal * gst_rate / 100).quantize(Decimal('0.01'))
        discount = Decimal('0')
        total = subtotal + gst_amount - discount

        # Award loyalty points: 1 pt per ₹100
        loyalty_earned = int(total / 100)

        invoice = Invoice.objects.create(
            invoice_number=invoice_number,
            customer=customer,
            appointment=None,
            is_walkin=True,
            subtotal=subtotal,
            gst_amount=gst_amount,
            discount_amount=discount,
            loyalty_points_used=0,
            total_amount=total,
            payment_method=payment_method,
            payment_status='paid',
            notes='Walk-in seeded',
            created_at=created_at,
        )

        for svc in selected_services:
            InvoiceItem.objects.create(
                invoice=invoice,
                service=svc,
                stylist=owner,
                price=Decimal(str(svc.price)),
                gst_rate=gst_rate,
                gst_amount=(Decimal(str(svc.price)) * gst_rate / 100).quantize(Decimal('0.01')),
            )

        # Update customer loyalty points
        customer.loyalty_points += loyalty_earned
        customer.save(update_fields=['loyalty_points'])

        created += 1
        print(f"  Walk-in invoice {invoice_number} — {customer.name} — ₹{total} ({payment_method})")

    print(f"  Created {created} walk-in invoices")


if __name__ == '__main__':
    print("=== Seeding Phase 3 Data ===\n")
    seed_service_product_mappings()
    seed_inventory_transactions()
    seed_low_stock_products()
    seed_walkin_invoices()
    print("\n=== Phase 3 Seed Complete ===")
    print("Run: source backend/venv/bin/activate && python seed_phase3.py")
