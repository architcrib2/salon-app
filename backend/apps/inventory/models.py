"""
Inventory app models.
Tracks salon product stock levels, reorder alerts, and supplier info.
quantity_in_stock supports decimals (e.g., 250.5 ml remaining).
"""
from django.db import models


class Product(models.Model):
    """
    Salon product in inventory.
    When quantity_in_stock <= reorder_level, the product is flagged as 'low stock'
    and surfaces in dashboard alerts and the inventory list.
    cost_price is in INR.
    """

    name = models.CharField(max_length=100)
    brand = models.CharField(max_length=50, blank=True)
    category = models.CharField(max_length=50)  # Shampoo, Hair Colour, Wax, etc.
    quantity_in_stock = models.DecimalField(max_digits=8, decimal_places=2)
    unit = models.CharField(max_length=20)  # ml, grams, pieces, litres
    # Alert threshold — triggers low-stock warning when stock <= this value
    reorder_level = models.DecimalField(max_digits=8, decimal_places=2)
    cost_price = models.DecimalField(max_digits=8, decimal_places=2)
    supplier_name = models.CharField(max_length=100, blank=True)
    last_restocked = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'

    def __str__(self):
        return f"{self.name} ({self.brand}) — {self.quantity_in_stock} {self.unit}"

    @property
    def current_stock(self):
        """Source of truth: sum of all InventoryTransaction.quantity_change for this product."""
        from django.db.models import Sum
        from decimal import Decimal
        result = self.transactions.aggregate(total=Sum('quantity_change'))
        return result['total'] or Decimal('0.00')

    @property
    def is_low_stock(self):
        """True when quantity_in_stock is at or below the reorder level."""
        return self.quantity_in_stock <= self.reorder_level


class InventoryTransaction(models.Model):
    """
    Immutable ledger of every stock movement.
    POSITIVE quantity_change = stock in (restock, return).
    NEGATIVE quantity_change = stock out (usage, wastage, adjustment).
    The current stock level = sum of all quantity_changes for a product.
    """

    TRANSACTION_TYPES = [
        ('restock',    'Restock / Purchase'),
        ('usage',      'Used in Service'),
        ('adjustment', 'Manual Adjustment'),
        ('wastage',    'Wastage / Damage'),
        ('return',     'Return to Supplier'),
    ]

    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity_change = models.DecimalField(max_digits=8, decimal_places=2)
    quantity_before = models.DecimalField(max_digits=8, decimal_places=2)
    quantity_after = models.DecimalField(max_digits=8, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reference_appointment = models.ForeignKey(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='inventory_transactions'
    )
    reference_invoice = models.ForeignKey(
        'billing.Invoice', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='inventory_transactions'
    )
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        'accounts.StaffMember', on_delete=models.PROTECT, related_name='inventory_transactions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Inventory Transaction'
        verbose_name_plural = 'Inventory Transactions'

    def __str__(self):
        return f"{self.get_transaction_type_display()} {self.quantity_change} {self.product.unit} of {self.product.name}"


class ServiceProductUsage(models.Model):
    """
    Defines how much of each product is consumed when a service is performed.
    Drives automatic inventory deduction on invoice creation.
    """
    service = models.ForeignKey(
        'services.Service', on_delete=models.CASCADE, related_name='product_usages'
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='service_usages')
    quantity_used = models.DecimalField(max_digits=6, decimal_places=2)
    unit = models.CharField(max_length=20)   # e.g. "ml", "grams", "applications"
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = [('service', 'product')]
        verbose_name = 'Service Product Usage'
        verbose_name_plural = 'Service Product Usages'

    def __str__(self):
        return f"{self.service.name} uses {self.quantity_used} {self.unit} of {self.product.name}"
