"""
Salon Management App — Demo Data Seeder.
Run after migrations: python seed.py
Creates realistic Indian salon demo data using Faker en_IN locale.
Creates: 1 owner + 4 stylists, 8 categories, 30+ services, 50 customers,
90 days of appointments, invoices for completed ones, 15 inventory products.
"""
import os
import sys
import django
import random
from decimal import Decimal
from datetime import datetime, timedelta, date

# ── Django setup ─────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'salon_project.settings')
django.setup()

from faker import Faker
from django.utils import timezone
from django.db import transaction

from apps.accounts.models import StaffMember
from apps.customers.models import Customer
from apps.services.models import Service, ServiceCategory
from apps.appointments.models import Appointment
from apps.billing.models import Invoice, InvoiceItem
from apps.inventory.models import Product

fake = Faker('en_IN')
random.seed(42)

IST = timezone.get_current_timezone()

# ── Indian salon service data ─────────────────────────────────────────────────
CATEGORIES_DATA = [
    {'name': 'Hair', 'gender': 'unisex'},
    {'name': 'Skin', 'gender': 'female'},
    {'name': 'Nails', 'gender': 'female'},
    {'name': 'Bridal', 'gender': 'female'},
    {'name': 'Spa', 'gender': 'unisex'},
    {'name': 'Beard', 'gender': 'male'},
    {'name': 'Wax', 'gender': 'female'},
    {'name': 'Colour', 'gender': 'unisex'},
]

SERVICES_DATA = {
    'Hair': [
        ('Haircut (Ladies)', 45, 350), ('Haircut (Gents)', 30, 200),
        ('Blow Dry', 30, 300), ('Hair Spa', 60, 800),
        ('Keratin Treatment', 120, 3500), ('Smoothening', 150, 4500),
        ('Rebonding', 180, 5000), ('Head Massage', 30, 250),
    ],
    'Skin': [
        ('Basic Facial', 45, 600), ('Fruit Facial', 60, 800),
        ('Gold Facial', 60, 1200), ('Anti-Tan Facial', 45, 700),
        ('Cleanup', 30, 350), ('Detan Face & Neck', 30, 400),
        ('Bleach', 30, 300),
    ],
    'Nails': [
        ('Manicure', 45, 400), ('Pedicure', 60, 500),
        ('Gel Nails', 60, 900), ('Nail Art (per nail)', 15, 50),
        ('Nail Extension', 90, 1500),
    ],
    'Bridal': [
        ('Bridal Makeup', 120, 8000), ('Pre-Bridal Package', 240, 15000),
        ('Engagement Makeup', 90, 5000), ('Mehendi', 60, 2000),
    ],
    'Spa': [
        ('Swedish Massage (60 min)', 60, 1500), ('Deep Tissue Massage', 90, 2200),
        ('Foot Reflexology', 45, 900), ('Back Massage', 45, 1000),
        ('Full Body Polishing', 90, 2500),
    ],
    'Beard': [
        ('Beard Trim', 20, 150), ('Beard Shaping', 30, 200),
        ('Clean Shave', 20, 150), ('Beard Colour', 20, 250),
        ('Beard Spa', 30, 400),
    ],
    'Wax': [
        ('Full Arms Wax', 30, 300), ('Full Legs Wax', 45, 450),
        ('Underarms Wax', 15, 150), ('Full Body Wax', 90, 1200),
        ('Face Wax', 20, 200), ('Bikini Wax', 30, 500),
    ],
    'Colour': [
        ('Global Hair Colour', 90, 1800), ('Highlights (Foil)', 120, 2500),
        ('Balayage', 150, 3500), ('Root Touch-up', 45, 800),
        ('Beard Colour', 20, 250), ('Fashion Highlights', 90, 2000),
    ],
}

INVENTORY_DATA = [
    # name, brand, category, qty, unit, reorder_level, cost_price, supplier
    ('Kerastase Shampoo', 'Kerastase', 'Shampoo', 8, 'bottles', 3, 450, 'Beauty Distributors Pvt Ltd'),
    ('Wella Color 6/0', 'Wella', 'Hair Colour', 15, 'tubes', 5, 280, 'Wella India'),
    ('L\'Oreal Bleach Powder', 'L\'Oreal', 'Bleach', 2, 'kg', 1, 650, 'L\'Oreal India'),  # LOW STOCK
    ('Rica Wax (Honey)', 'Rica', 'Wax', 3, 'cans', 2, 380, 'Rica India'),  # LOW STOCK
    ('Schwarzkopf Conditioner', 'Schwarzkopf', 'Conditioner', 12, 'bottles', 4, 320, 'Schwarzkopf India'),
    ('Olive Oil Spa Cream', 'OGX', 'Spa Products', 6, 'jars', 3, 520, 'Cosmo Distributors'),
    ('Facial Kit (Gold)', 'VLCC', 'Facial Kit', 1, 'box', 2, 890, 'VLCC'),  # LOW STOCK
    ('Nail Polish Remover', 'Elle 18', 'Nail Products', 10, 'bottles', 3, 45, 'Lakme India'),
    ('Gel Top Coat', 'OPI', 'Nail Products', 4, 'bottles', 2, 680, 'OPI Distributors'),
    ('Keratin Treatment Kit', 'BaByliss Pro', 'Keratin', 5, 'kits', 2, 2200, 'BaByliss India'),
    ('Hair Serum (Argan)', 'Moroccanoil', 'Hair Care', 7, 'bottles', 3, 750, 'Premium Hair Care'),
    ('Threading Thread', 'Generic', 'Threading', 50, 'rolls', 10, 15, 'Local Supplier'),
    ('Disposable Towels', 'Generic', 'Supplies', 200, 'pieces', 50, 8, 'Wholesale Mart'),
    ('Talcum Powder', 'Ponds', 'Wax', 4, 'containers', 2, 95, 'HUL Distributors'),
    ('UV Gel Nail Builder', 'IBD', 'Nail Products', 2, 'bottles', 3, 1200, 'Nail Art Studio'),  # LOW STOCK
]

INDIAN_STAFF = [
    ('priya_sharma', 'Priya', 'Sharma', 'priya@salon.com', '9876543211', 20),
    ('rahul_verma', 'Rahul', 'Verma', 'rahul@salon.com', '9876543212', 18),
    ('anjali_singh', 'Anjali', 'Singh', 'anjali@salon.com', '9876543213', 22),
    ('vikram_nair', 'Vikram', 'Nair', 'vikram@salon.com', '9876543214', 15),
]


def create_staff():
    print("Creating staff members...")
    # Owner
    owner, created = StaffMember.objects.get_or_create(username='admin')
    if created or not owner.has_usable_password():
        owner.set_password('demo1234')
    owner.first_name = 'Rajan'
    owner.last_name = 'Kapoor'
    owner.email = 'admin@salon.com'
    owner.role = 'owner'
    owner.phone = '9876543210'
    owner.is_staff = True
    owner.is_superuser = True
    owner.save()
    print(f"  Owner: admin / demo1234")

    # Stylists
    stylists = []
    for username, first, last, email, phone, commission in INDIAN_STAFF:
        staff, created = StaffMember.objects.get_or_create(username=username)
        staff.set_password('demo1234')
        staff.first_name = first
        staff.last_name = last
        staff.email = email
        staff.phone = phone
        staff.role = 'stylist'
        staff.commission_rate = commission
        staff.is_active_staff = True
        staff.save()
        stylists.append(staff)
        print(f"  Stylist: {first} {last} ({commission}% commission)")

    return owner, stylists


def create_categories_and_services():
    print("Creating service categories and services...")
    categories = {}
    for cat_data in CATEGORIES_DATA:
        cat, _ = ServiceCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={'gender': cat_data['gender']}
        )
        categories[cat_data['name']] = cat

    services_by_cat = {}
    total_services = 0
    for cat_name, services_list in SERVICES_DATA.items():
        cat = categories[cat_name]
        services_by_cat[cat_name] = []
        for svc_name, duration, price in services_list:
            svc, _ = Service.objects.get_or_create(
                name=svc_name,
                category=cat,
                defaults={
                    'duration_minutes': duration,
                    'price': Decimal(str(price)),
                    'gst_rate': Decimal('18.00'),
                    'is_active': True,
                }
            )
            services_by_cat[cat_name].append(svc)
            total_services += 1

    print(f"  Created {len(categories)} categories, {total_services} services")
    return categories, services_by_cat


def create_customers():
    print("Creating 50 customers...")
    customers = []
    indian_names = [
        "Priya Sharma", "Anjali Gupta", "Sunita Patel", "Rekha Singh", "Meena Verma",
        "Kavita Joshi", "Pooja Mehta", "Divya Nair", "Anita Desai", "Ritu Agarwal",
        "Sushma Rao", "Deepa Iyer", "Neha Khanna", "Shweta Tiwari", "Poonam Yadav",
        "Mamta Dubey", "Geeta Mishra", "Lata Srivastava", "Uma Pandey", "Asha Chauhan",
        "Rahul Kumar", "Amit Sharma", "Vikash Singh", "Rohit Patel", "Suresh Verma",
        "Arun Gupta", "Dinesh Jha", "Manoj Tiwari", "Ravi Nair", "Anil Mehta",
        "Sonal Kapoor", "Rima Bose", "Tanvi Shah", "Preethi Menon", "Madhuri Deka",
        "Arjun Pillai", "Kiran Reddy", "Swetha Krishnan", "Bindu Nambiar", "Devika Pillai",
        "Shilpa Shetty", "Mona Jain", "Radha Kumari", "Fatima Khan", "Zara Sheikh",
        "Sameera Ansari", "Aakash Thakur", "Gaurav Bansal", "Nitin Goel", "Paresh Doshi",
    ]

    genders = ['female'] * 35 + ['male'] * 15
    random.shuffle(genders)

    for i, name in enumerate(indian_names):
        phone = f"98{random.randint(10000000, 99999999)}"
        # Ensure unique phone
        while Customer.objects.filter(phone=phone).exists():
            phone = f"98{random.randint(10000000, 99999999)}"

        try:
            customer, created = Customer.objects.get_or_create(
                phone=phone,
                defaults={
                    'name': name,
                    'gender': genders[i],
                    'email': f"{name.lower().replace(' ', '.')}@gmail.com",
                    'notes': random.choice([
                        'Prefers Wella products', 'Sensitive scalp', 'Allergic to ammonia',
                        'Regular client since 2022', 'Prefers Priya as stylist', '',
                        'Wants WhatsApp reminder before appointment', 'Birthday in June',
                    ]),
                    'loyalty_points': random.randint(0, 500),
                    'created_at': timezone.make_aware(
                        datetime.now() - timedelta(days=random.randint(30, 365))
                    ),
                }
            )
            customers.append(customer)
        except Exception:
            pass

    print(f"  Created {len(customers)} customers")
    return customers


def create_appointments_and_invoices(customers, stylists, services_by_cat):
    print("Creating 90 days of appointments and invoices...")
    all_services = Service.objects.all()
    appointment_count = 0
    invoice_count = 0

    today = date.today()

    for days_ago in range(90, -1, -1):
        appt_date = today - timedelta(days=days_ago)

        # 3-8 appointments per day
        num_appts = random.randint(3, 8)

        for _ in range(num_appts):
            customer = random.choice(customers)
            stylist = random.choice(stylists)

            # Pick 1-3 services
            num_services = random.randint(1, 3)
            selected_services = random.sample(list(all_services), min(num_services, len(all_services)))

            # Schedule between 9AM and 8PM
            hour = random.randint(9, 20)
            minute = random.choice([0, 30])
            scheduled_dt = timezone.make_aware(
                datetime(appt_date.year, appt_date.month, appt_date.day, hour, minute)
            )

            duration = sum(s.duration_minutes for s in selected_services)

            # Determine status based on date
            if appt_date < today:
                status = random.choices(
                    ['completed', 'cancelled', 'no_show'],
                    weights=[75, 15, 10]
                )[0]
            elif appt_date == today:
                status = random.choice(['scheduled', 'in_progress', 'completed'])
            else:
                status = 'scheduled'

            try:
                appt = Appointment.objects.create(
                    customer=customer,
                    stylist=stylist,
                    scheduled_at=scheduled_dt,
                    duration_minutes=duration,
                    status=status,
                    notes=random.choice(['', 'Walk-in', 'Called ahead', 'Regular client']),
                    created_by=stylist,
                )
                appt.services.set(selected_services)
                appointment_count += 1

                # Create invoice for completed appointments
                if status == 'completed':
                    subtotal = sum(s.price for s in selected_services)
                    gst_amount = sum(
                        (s.price * s.gst_rate / 100).quantize(Decimal('0.01'))
                        for s in selected_services
                    )
                    discount = Decimal('0')
                    if random.random() < 0.2:  # 20% chance of discount
                        discount = Decimal(str(random.choice([50, 100, 200])))

                    total = subtotal + gst_amount - discount

                    payment_method = random.choices(
                        ['cash', 'upi', 'card'],
                        weights=[40, 45, 15]
                    )[0]

                    # Generate invoice number
                    prefix = f"INV-{scheduled_dt.strftime('%Y%m')}-"
                    count = Invoice.objects.filter(invoice_number__startswith=prefix).count()
                    invoice_number = f"{prefix}{str(count + 1).zfill(4)}"

                    invoice = Invoice.objects.create(
                        appointment=appt,
                        invoice_number=invoice_number,
                        customer=customer,
                        subtotal=subtotal,
                        gst_amount=gst_amount,
                        discount_amount=discount,
                        total_amount=total,
                        payment_method=payment_method,
                        payment_status='paid',
                        created_at=scheduled_dt,
                    )

                    # Invoice items (line items per service)
                    for service in selected_services:
                        item_gst = (service.price * service.gst_rate / 100).quantize(Decimal('0.01'))
                        InvoiceItem.objects.create(
                            invoice=invoice,
                            service=service,
                            stylist=stylist,
                            price=service.price,
                            gst_rate=service.gst_rate,
                            gst_amount=item_gst,
                        )

                    invoice_count += 1

                    # Update customer last_visit
                    if not customer.last_visit or appt_date > customer.last_visit:
                        customer.last_visit = appt_date
                        customer.save(update_fields=['last_visit'])

            except Exception as e:
                pass  # Skip duplicate conflicts

    print(f"  Created {appointment_count} appointments, {invoice_count} invoices")


def create_inventory():
    print("Creating inventory products...")
    count = 0
    for name, brand, category, qty, unit, reorder, cost, supplier in INVENTORY_DATA:
        Product.objects.get_or_create(
            name=name,
            brand=brand,
            defaults={
                'category': category,
                'quantity_in_stock': Decimal(str(qty)),
                'unit': unit,
                'reorder_level': Decimal(str(reorder)),
                'cost_price': Decimal(str(cost)),
                'supplier_name': supplier,
                'last_restocked': date.today() - timedelta(days=random.randint(7, 60)),
            }
        )
        count += 1

    low_stock = low_stock_count()
    print(f"  Created {count} products ({low_stock} below reorder level)")


def low_stock_count():
    from django.db.models import F
    return Product.objects.filter(quantity_in_stock__lte=F('reorder_level')).count()


def main():
    print("=" * 60)
    print("  Salon Management App — Seeding Demo Data")
    print("=" * 60)

    with transaction.atomic():
        owner, stylists = create_staff()
        categories, services_by_cat = create_categories_and_services()
        customers = create_customers()
        create_appointments_and_invoices(customers, stylists, services_by_cat)
        create_inventory()

    print("=" * 60)
    print("  Seeding complete!")
    print(f"  Staff:        {StaffMember.objects.count()} members")
    print(f"  Customers:    {Customer.objects.count()}")
    print(f"  Services:     {Service.objects.count()} across {ServiceCategory.objects.count()} categories")
    print(f"  Appointments: {Appointment.objects.count()}")
    print(f"  Invoices:     {Invoice.objects.count()}")
    print(f"  Inventory:    {Product.objects.count()} products ({low_stock_count()} low stock)")
    print("=" * 60)
    print("  Login: http://localhost:5173  |  admin / demo1234")
    print("=" * 60)


if __name__ == '__main__':
    main()
