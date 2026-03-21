"""
Phase 2 seed script — idempotent.
Adds referral codes, membership plans, memberships, waitlist entries,
public booking requests, campaigns, and WhatsApp notifications.

Run from project root:
    source backend/venv/bin/activate
    python seed_phase2.py
"""
import os
import sys
import django
import random
import string
from datetime import date, timedelta, datetime
import pytz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'salon_project.settings')
django.setup()

from apps.customers.models import Customer
from apps.accounts.models import StaffMember
from apps.services.models import Service
from apps.appointments.models import Appointment, PublicBookingRequest
from apps.memberships.models import MembershipPlan, CustomerMembership, MembershipRedemption
from apps.waitlist.models import WaitlistEntry
from apps.campaigns.models import Campaign, CampaignRecipient
from apps.notifications.models import WhatsAppNotification

IST = pytz.timezone('Asia/Kolkata')


def make_referral_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def seed_referral_codes():
    """Assign unique referral codes to all customers."""
    print("Seeding referral codes...")
    customers = list(Customer.objects.all())
    updated = 0
    for customer in customers:
        if not customer.referral_code:
            while True:
                code = make_referral_code()
                if not Customer.objects.filter(referral_code=code).exists():
                    break
            customer.referral_code = code
            customer.save(update_fields=['referral_code'])
            updated += 1

    # Create 10 referral relationships
    shuffled = random.sample(customers, min(20, len(customers)))
    referrers = shuffled[:10]
    referees = shuffled[10:20]
    created = 0
    for referrer, referee in zip(referrers, referees):
        if referee.referred_by is None and referee.id != referrer.id:
            referee.referred_by = referrer
            referrer.referral_points_earned += 50
            referee.loyalty_points += 25  # welcome bonus
            referee.save(update_fields=['referred_by', 'loyalty_points'])
            referrer.save(update_fields=['referral_points_earned'])
            created += 1

    print(f"  Updated {updated} referral codes, {created} referral relationships")


def seed_membership_plans():
    """Create 3 membership plans."""
    print("Seeding membership plans...")
    services = list(Service.objects.filter(is_active=True)[:10])

    plans_data = [
        {
            'name': 'Silver Plan',
            'description': '10 sessions of basic services valid for 3 months',
            'total_sessions': 10,
            'validity_days': 90,
            'price': 3500,
        },
        {
            'name': 'Gold Plan',
            'description': '20 sessions of premium services valid for 6 months',
            'total_sessions': 20,
            'validity_days': 180,
            'price': 6500,
        },
        {
            'name': 'Platinum Plan',
            'description': 'Unlimited sessions for 30 days — all services included',
            'total_sessions': 30,
            'validity_days': 30,
            'price': 4999,
        },
    ]

    created_plans = []
    for pdata in plans_data:
        plan, created = MembershipPlan.objects.get_or_create(
            name=pdata['name'],
            defaults={**pdata, 'is_active': True}
        )
        if services:
            plan.services.set(services[:5])
        created_plans.append(plan)
        if created:
            print(f"  Created plan: {plan.name}")
        else:
            print(f"  Plan exists: {plan.name}")

    return created_plans


def seed_memberships(plans):
    """Create 15 memberships with 30 redemptions."""
    print("Seeding customer memberships...")
    customers = list(Customer.objects.order_by('?')[:15])
    stylists = list(StaffMember.objects.filter(role='stylist', is_active_staff=True))
    appointments = list(Appointment.objects.filter(status='completed')[:30])

    today = date.today()
    statuses = ['active'] * 10 + ['expired'] * 3 + ['exhausted'] * 2
    created_count = 0

    for i, customer in enumerate(customers):
        plan = plans[i % len(plans)]
        if CustomerMembership.objects.filter(customer=customer, plan=plan).exists():
            continue

        days_ago = random.randint(0, 120)
        purchased = today - timedelta(days=days_ago)
        valid_until = purchased + timedelta(days=plan.validity_days)
        ms = statuses[i]

        sessions_used = random.randint(0, plan.total_sessions - 1) if ms == 'active' else (
            plan.total_sessions if ms == 'exhausted' else random.randint(0, plan.total_sessions)
        )

        membership = CustomerMembership.objects.create(
            customer=customer,
            plan=plan,
            purchased_at=datetime.combine(purchased, datetime.min.time()).replace(tzinfo=IST),
            valid_until=valid_until,
            sessions_total=plan.total_sessions,
            sessions_used=sessions_used,
            sessions_remaining=max(0, plan.total_sessions - sessions_used),
            amount_paid=plan.price,
            payment_method=random.choice(['cash', 'upi', 'card']),
            status=ms,
        )
        created_count += 1

        # Create up to 3 redemptions per membership
        if sessions_used > 0 and appointments and stylists:
            redemption_count = min(sessions_used, 3, len(appointments))
            for appt in random.sample(appointments, redemption_count):
                services = list(appt.services.all())
                if not services:
                    continue
                service = random.choice(services)
                MembershipRedemption.objects.get_or_create(
                    membership=membership,
                    appointment=appt,
                    service=service,
                    defaults={
                        'redeemed_by': random.choice(stylists),
                        'value_redeemed': service.price,
                    }
                )

    print(f"  Created {created_count} memberships")


def seed_waitlist():
    """Create 8 waitlist entries for today."""
    print("Seeding waitlist entries...")
    # Clear today's entries first (idempotent)
    WaitlistEntry.objects.filter(added_at__date=date.today()).delete()

    names = [
        ('Priya Sharma', '9876543001'),
        ('Rahul Gupta', '9876543002'),
        ('Ananya Singh', '9876543003'),
        ('Vikram Mehta', '9876543004'),
        ('Sunita Patel', '9876543005'),
        ('Arjun Kumar', '9876543006'),
        ('Deepika Nair', '9876543007'),
        ('Manish Verma', '9876543008'),
    ]

    statuses = ['waiting', 'waiting', 'waiting', 'in_progress', 'in_progress', 'done', 'done', 'cancelled']
    stylists = list(StaffMember.objects.filter(role='stylist', is_active_staff=True))
    services = list(Service.objects.filter(is_active=True)[:5])

    for i, ((name, phone), status) in enumerate(zip(names, statuses)):
        entry = WaitlistEntry.objects.create(
            walk_in_name=name,
            walk_in_phone=phone,
            status=status,
            notes=f"Walk-in customer #{i+1}",
        )
        if services:
            entry.requested_services.set(random.sample(services, min(2, len(services))))
        if stylists and random.random() > 0.5:
            entry.preferred_stylist = random.choice(stylists)
            entry.save(update_fields=['preferred_stylist'])

    WaitlistEntry.recalculate_queue()
    print(f"  Created {len(names)} waitlist entries")


def seed_booking_requests():
    """Create 10 public booking requests."""
    print("Seeding public booking requests...")
    services = list(Service.objects.filter(is_active=True).values_list('id', flat=True)[:10])
    stylists = list(StaffMember.objects.filter(role='stylist', is_active_staff=True))
    today = date.today()

    requests_data = [
        ('Kavya Reddy', '9912345601', 'kavya@example.com', 'pending'),
        ('Sanjay Bose', '9912345602', '', 'pending'),
        ('Meera Iyer', '9912345603', 'meera@example.com', 'confirmed'),
        ('Rohit Sharma', '9912345604', '', 'confirmed'),
        ('Pooja Agarwal', '9912345605', 'pooja@example.com', 'pending'),
        ('Amit Joshi', '9912345606', '', 'rejected'),
        ('Shreya Das', '9912345607', 'shreya@example.com', 'pending'),
        ('Nitin Kapoor', '9912345608', '', 'confirmed'),
        ('Asha Rao', '9912345609', 'asha@example.com', 'pending'),
        ('Dev Malhotra', '9912345610', '', 'pending'),
    ]

    created = 0
    for name, phone, email, status in requests_data:
        if PublicBookingRequest.objects.filter(customer_phone=phone).exists():
            continue

        days_offset = random.randint(1, 7)
        req_date = today + timedelta(days=days_offset)
        hour = random.choice([10, 11, 12, 14, 15, 16, 17, 18])
        req_time = f"{hour:02d}:00"

        svc_ids = random.sample(list(services), min(2, len(services)))
        stylist = random.choice(stylists) if stylists and random.random() > 0.5 else None

        PublicBookingRequest.objects.create(
            customer_name=name,
            customer_phone=phone,
            customer_email=email,
            service_ids=svc_ids,
            preferred_stylist=stylist,
            preferred_date=req_date,
            preferred_time=req_time,
            notes='',
            status=status,
            rejection_reason='Fully booked on that day' if status == 'rejected' else '',
        )
        created += 1

    print(f"  Created {created} booking requests")


def seed_campaigns():
    """Create 3 campaigns."""
    print("Seeding campaigns...")
    owner = StaffMember.objects.filter(role='owner').first()
    customers = list(Customer.objects.all())
    today = date.today()

    campaigns_data = [
        {
            'name': 'Monsoon Reactivation',
            'target_segment': 'lapsed_60',
            'message_template': 'Hi {name}! We miss you at KaratOS Salon. Come back this monsoon and get 15% off. Book now! 📱',
            'status': 'sent',
            'days_ago': 15,
        },
        {
            'name': 'Diwali Special Offer',
            'target_segment': 'all',
            'message_template': 'Happy Diwali {name}! Celebrate with a special salon treat. 20% off on all services this week! 🪔',
            'status': 'sent',
            'days_ago': 5,
        },
        {
            'name': 'Loyalty Reward Campaign',
            'target_segment': 'loyalty_low',
            'message_template': 'Hi {name}! You have loyalty points waiting. Use them on your next visit and save big! 💫',
            'status': 'draft',
            'days_ago': 0,
        },
    ]

    for cdata in campaigns_data:
        campaign, created = Campaign.objects.get_or_create(
            name=cdata['name'],
            defaults={
                'message_template': cdata['message_template'],
                'target_segment': cdata['target_segment'],
                'status': cdata['status'],
                'created_by': owner,
                'sent_at': datetime.now(IST) - timedelta(days=cdata['days_ago']) if cdata['status'] == 'sent' else None,
            }
        )

        if created and cdata['status'] == 'sent' and customers:
            # Add recipients for sent campaigns
            sample_customers = random.sample(customers, min(20, len(customers)))
            recipients = []
            for c in sample_customers:
                recipients.append(CampaignRecipient(
                    campaign=campaign,
                    customer=c,
                    phone_number=c.phone,
                    personalised_message=cdata['message_template'].replace('{name}', c.name.split()[0]),
                    status='sent',
                    sent_at=campaign.sent_at,
                ))
            CampaignRecipient.objects.bulk_create(recipients, ignore_conflicts=True)
            campaign.total_recipients = len(recipients)
            campaign.save(update_fields=['total_recipients'])
            print(f"  Campaign '{campaign.name}': {len(recipients)} recipients")
        elif created:
            print(f"  Campaign '{campaign.name}': draft")
        else:
            print(f"  Campaign exists: {campaign.name}")


def seed_notifications():
    """Create 50 WhatsApp notification records."""
    print("Seeding WhatsApp notifications...")
    customers = list(Customer.objects.order_by('?')[:50])
    appointments = list(Appointment.objects.filter(status__in=['scheduled', 'completed'])[:30])
    today = date.today()

    notif_types = [
        ('booking_confirm', 0.3),
        ('reminder_1hr', 0.25),
        ('review_request', 0.2),
        ('campaign', 0.15),
        ('referral_welcome', 0.1),
    ]
    statuses = ['sent', 'sent', 'sent', 'pending', 'failed']

    created = 0
    for customer in customers:
        if WhatsAppNotification.objects.filter(customer=customer).exists():
            continue

        # Pick random type
        r = random.random()
        cumulative = 0
        ntype = 'booking_confirm'
        for t, prob in notif_types:
            cumulative += prob
            if r <= cumulative:
                ntype = t
                break

        status = random.choice(statuses)
        days_ago = random.randint(0, 30)
        scheduled = datetime.now(IST) - timedelta(days=days_ago, hours=random.randint(0, 23))

        templates = {
            'booking_confirm': f'Hi {customer.name.split()[0]}! Your appointment at KaratOS Salon is confirmed. See you soon!',
            'reminder_1hr': f'Hi {customer.name.split()[0]}! Reminder: your appointment is in 1 hour. We\'re ready for you!',
            'review_request': f'Hi {customer.name.split()[0]}! How was your visit? We\'d love your feedback. ⭐',
            'campaign': f'Hi {customer.name.split()[0]}! Special offer just for you at KaratOS Salon. Book now!',
            'referral_welcome': f'Welcome to KaratOS Salon, {customer.name.split()[0]}! You\'ve been referred by a friend. Enjoy 10% off!',
        }

        appt = None
        if ntype in ('booking_confirm', 'reminder_1hr') and appointments:
            appt = random.choice(appointments)

        WhatsAppNotification.objects.create(
            customer=customer,
            appointment=appt,
            notification_type=ntype,
            phone_number=customer.phone,
            message_body=templates[ntype],
            status=status,
            scheduled_at=scheduled,
            sent_at=scheduled + timedelta(seconds=random.randint(1, 60)) if status == 'sent' else None,
            error_message='Connection timeout' if status == 'failed' else '',
        )
        created += 1

    print(f"  Created {created} notifications")


if __name__ == '__main__':
    print("=== Seeding Phase 2 Data ===\n")
    seed_referral_codes()
    plans = seed_membership_plans()
    seed_memberships(plans)
    seed_waitlist()
    seed_booking_requests()
    seed_campaigns()
    seed_notifications()
    print("\n=== Phase 2 Seed Complete ===")
    print("Run: source backend/venv/bin/activate && python seed_phase2.py")
