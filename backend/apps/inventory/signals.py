"""Inventory signals — sync Product.quantity_in_stock cache after each transaction."""
from django.db.models.signals import post_save
from django.dispatch import receiver


def connect_signals():
    from apps.inventory.models import InventoryTransaction

    @receiver(post_save, sender=InventoryTransaction)
    def sync_product_stock(sender, instance, created, **kwargs):
        if created:
            # Update the cached quantity_in_stock on the product
            product = instance.product
            product.quantity_in_stock = instance.quantity_after
            product.save(update_fields=['quantity_in_stock'])
