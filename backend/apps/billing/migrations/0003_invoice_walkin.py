from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0002_alter_invoice_created_at'),
        ('appointments', '0002_publicbookingrequest'),
    ]

    operations = [
        # Step 1: Remove the old OneToOneField constraint by adding a new nullable FK field temporarily
        migrations.AddField(
            model_name='invoice',
            name='appointment_fk',
            field=models.ForeignKey(
                'appointments.Appointment',
                on_delete=django.db.models.deletion.PROTECT,
                null=True, blank=True,
                related_name='invoices_fk',
            ),
        ),
        # Step 2: Add is_walkin flag
        migrations.AddField(
            model_name='invoice',
            name='is_walkin',
            field=models.BooleanField(default=False),
        ),
        # Step 3: Copy appointment_id values to appointment_fk_id
        migrations.RunSQL(
            "UPDATE billing_invoice SET appointment_fk_id = appointment_id",
            reverse_sql="UPDATE billing_invoice SET appointment_id = appointment_fk_id",
        ),
        # Step 4: Make original appointment nullable
        migrations.AlterField(
            model_name='invoice',
            name='appointment',
            field=models.ForeignKey(
                'appointments.Appointment',
                on_delete=django.db.models.deletion.PROTECT,
                null=True, blank=True,
                related_name='invoices_old',
            ),
        ),
        # Step 5: Copy back from fk to main field
        migrations.RunSQL(
            "UPDATE billing_invoice SET appointment_id = appointment_fk_id",
            reverse_sql="",
        ),
        # Step 6: Remove the temporary field
        migrations.RemoveField(
            model_name='invoice',
            name='appointment_fk',
        ),
        # Step 7: Rename related_name to 'invoices'
        migrations.AlterField(
            model_name='invoice',
            name='appointment',
            field=models.ForeignKey(
                'appointments.Appointment',
                on_delete=django.db.models.deletion.PROTECT,
                null=True, blank=True,
                related_name='invoices',
            ),
        ),
    ]
