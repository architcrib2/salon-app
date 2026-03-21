"""
WhatsApp message templates for all notification types.
Placeholders use Python str.format() style: {name}, {salon_name}, etc.
"""

SALON_NAME = 'KaratOS Salon'

BOOKING_CONFIRM = (
    "Hi {name}! Your appointment at {salon_name} is confirmed for {date} at {time} "
    "with {stylist}. See you soon! ✂️"
)

REMINDER_1HR = (
    "Hi {name}! Reminder: Your appointment is in 1 hour at {time} with {stylist}. "
    "We look forward to seeing you! 😊"
)

REVIEW_REQUEST = (
    "Hi {name}! Thanks for visiting {salon_name}. We hope you loved your experience! "
    "We would love your feedback on Google ⭐ — it helps us a lot!"
)

REFERRAL_WELCOME = (
    "Hi {name}! Great news — {new_customer_name} joined {salon_name} using your referral code. "
    "You have earned 100 loyalty points! 🎉 Thank you for spreading the word."
)

CAMPAIGN = "{message}"  # Campaigns use free-form text

REBOOKING_NUDGE = (
    "Hi {name}! We miss you at {salon_name}. It's been {days} days since your last visit. "
    "Book your next appointment with {stylist_name} here: {booking_link} 💇"
)
