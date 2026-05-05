from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0004_invoiceitem_stylist_nullable'),
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoiceitem',
            name='description',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AlterField(
            model_name='invoiceitem',
            name='service',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='services.service',
            ),
        ),
    ]
