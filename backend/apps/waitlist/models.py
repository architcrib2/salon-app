"""
Waitlist app models.
WaitlistEntry tracks walk-in queue position, estimated wait, and status.
Positions are 1-indexed and recalculated after every save using bulk update
(bypassing save() to avoid recursion).
"""
from django.db import models
from django.utils import timezone


class WaitlistEntry(models.Model):
    """
    Represents one person in the salon walk-in queue.
    customer FK is nullable — walk-ins who are not in the customer database use
    walk_in_name and walk_in_phone instead.
    Position and estimated_wait_minutes are recalculated on every status change.
    """

    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('in_progress', 'In Progress'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled'),
    ]

    customer = models.ForeignKey(
        'customers.Customer', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='waitlist_entries'
    )
    # Used when customer is a walk-in not in the system
    walk_in_name = models.CharField(max_length=100, blank=True)
    walk_in_phone = models.CharField(max_length=15, blank=True)
    requested_services = models.ManyToManyField('services.Service', blank=True)
    preferred_stylist = models.ForeignKey(
        'accounts.StaffMember', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='waitlist_preferences'
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='waiting')
    estimated_wait_minutes = models.IntegerField(default=0)
    # 1-indexed position in queue among 'waiting' entries
    position = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)
    called_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['position', 'added_at']
        verbose_name = 'Waitlist Entry'
        verbose_name_plural = 'Waitlist Entries'

    def __str__(self):
        name = self.customer.name if self.customer else self.walk_in_name
        return f"{name} — pos {self.position} [{self.status}]"

    @property
    def display_name(self):
        return self.customer.name if self.customer else self.walk_in_name

    @property
    def display_phone(self):
        return self.customer.phone if self.customer else self.walk_in_phone

    def save(self, *args, **kwargs):
        """Set timestamps on status transitions before saving."""
        if self.pk:
            try:
                old = WaitlistEntry.objects.filter(pk=self.pk).values('status').first()
                if old:
                    if old['status'] != 'in_progress' and self.status == 'in_progress':
                        self.called_at = timezone.now()
                    if old['status'] != 'done' and self.status == 'done':
                        self.completed_at = timezone.now()
            except Exception:
                pass

        super().save(*args, **kwargs)
        # Recalculate queue positions for all waiting entries using bulk update
        # (does NOT call save() — avoids infinite recursion)
        WaitlistEntry.recalculate_queue()

    @classmethod
    def recalculate_queue(cls):
        """
        Recalculate position and estimated_wait_minutes for all 'waiting' entries.
        Uses filter().update() to bypass save() and prevent recursion.
        estimated_wait_minutes for position N = sum of avg service durations of entries at positions 1..N-1.
        """
        waiting = list(cls.objects.filter(status='waiting').order_by('added_at').prefetch_related('requested_services'))

        # Calculate cumulative wait per entry
        cumulative = 0
        for i, entry in enumerate(waiting):
            services = list(entry.requested_services.all())
            if services:
                avg_duration = sum(s.duration_minutes for s in services) // len(services)
            else:
                avg_duration = 30  # default assumption: 30 min per person

            cls.objects.filter(pk=entry.pk).update(
                position=i + 1,
                estimated_wait_minutes=cumulative,
            )
            cumulative += avg_duration
