"""
Shared filter utility for all API views.
"""
from datetime import date


def parse_filter_params(request):
    """
    Reads standard filter params from request.GET.
    Returns a dict of parsed, validated filter values.
    All values optional — returns None/missing for absent/invalid params.
    """
    params = {}

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    if start_date:
        try:
            params['start_date'] = date.fromisoformat(start_date)
        except ValueError:
            pass
    if end_date:
        try:
            params['end_date'] = date.fromisoformat(end_date)
        except ValueError:
            pass

    staff_id = request.GET.get('staff_id')
    if staff_id and str(staff_id).isdigit():
        params['staff_id'] = int(staff_id)

    customer_id = request.GET.get('customer_id')
    if customer_id and str(customer_id).isdigit():
        params['customer_id'] = int(customer_id)

    branch_id = request.GET.get('branch_id')
    if branch_id and str(branch_id).isdigit():
        params['branch_id'] = int(branch_id)

    status = request.GET.get('status')
    if status:
        params['status'] = [s.strip() for s in status.split(',') if s.strip()]

    payment_method = request.GET.get('payment_method')
    if payment_method:
        params['payment_method'] = [m.strip() for m in payment_method.split(',') if m.strip()]

    notification_type = request.GET.get('notification_type')
    if notification_type:
        params['notification_type'] = notification_type.strip()

    return params


def apply_date_filter(queryset, params, date_field):
    """
    Applies start_date and end_date from parsed params to a queryset.
    Works for both DateField and DateTimeField.
    """
    if 'start_date' in params:
        queryset = queryset.filter(**{f'{date_field}__date__gte': params['start_date']})
    if 'end_date' in params:
        queryset = queryset.filter(**{f'{date_field}__date__lte': params['end_date']})
    return queryset
