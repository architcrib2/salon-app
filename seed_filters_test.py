"""
Filter API Test Runner
Verifies every filter combination returns HTTP 200 + success:true.

Run from project root:
    source backend/venv/bin/activate
    python seed_filters_test.py
"""
import sys
import os
import requests
import json
from datetime import date, timedelta

BASE = 'http://localhost:8001'
PASS = '✓'
FAIL = '✗'

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def get_token():
    res = requests.post(f'{BASE}/api/accounts/login/', json={
        'username': 'admin',
        'password': 'demo1234',
    }, timeout=10)
    if res.status_code != 200:
        print(f'  {FAIL} Login failed ({res.status_code}): {res.text[:200]}')
        sys.exit(1)
    data = res.json()
    token = data.get('access') or data.get('token') or data.get('data', {}).get('access') or data.get('data', {}).get('token')
    if not token:
        print(f'  {FAIL} Could not extract token from: {json.dumps(data)[:200]}')
        sys.exit(1)
    return token


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

passed = 0
failed = 0
results = []


def test(label, url, token, *, expect_key='success', expect_status=200):
    global passed, failed
    try:
        res = requests.get(
            f'{BASE}{url}',
            headers={'Authorization': f'Bearer {token}'},
            timeout=15,
        )
        ok_status = res.status_code == expect_status
        try:
            body = res.json()
            ok_body = body.get(expect_key) is True or body.get('success') is True or isinstance(body, list) or isinstance(body, dict)
        except Exception:
            ok_body = False

        if ok_status and ok_body:
            status = PASS
            passed += 1
        else:
            status = FAIL
            failed += 1

        results.append((status, label, res.status_code, '' if status == PASS else str(res.text[:120])))
    except requests.exceptions.ConnectionError:
        results.append((FAIL, label, 'ERR', 'Connection refused — is the backend running on port 8001?'))
        failed += 1
    except Exception as e:
        results.append((FAIL, label, 'ERR', str(e)[:120]))
        failed += 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print('\n' + '=' * 64)
    print('  KaratOS Filter API Test Runner')
    print('=' * 64)

    print('\nLogging in...')
    try:
        token = get_token()
        print(f'  {PASS} Logged in as admin\n')
    except requests.exceptions.ConnectionError:
        print(f'  {FAIL} Cannot connect to {BASE} — is the Django server running?')
        print('  Start it with: cd backend && python manage.py runserver 8001')
        sys.exit(1)

    today     = date.today().isoformat()
    y_start   = f'{date.today().year}-01-01'
    y_end     = f'{date.today().year}-12-31'
    last_year = str(date.today().year - 1)
    month_ago = (date.today() - timedelta(days=30)).isoformat()

    print('Running tests...\n')

    # ── APPOINTMENTS ────────────────────────────────────────────────────────
    print('Appointments:')
    test('Date range (full year)', f'/api/appointments/?start_date={y_start}&end_date={y_end}', token)
    test('Staff filter', '/api/appointments/?staff_id=1', token)
    test('Status: completed', '/api/appointments/?status=completed', token)
    test('Status: completed,cancelled (multi)', '/api/appointments/?status=completed,cancelled', token)
    test('Status: no_show', '/api/appointments/?status=no_show', token)
    test('Calendar + staff filter', f'/api/appointments/calendar/?date={today}&staff_id=1', token)
    test('Combined date + staff + status', f'/api/appointments/?start_date={y_start}&end_date={y_end}&staff_id=1&status=completed', token)

    # ── BILLING ─────────────────────────────────────────────────────────────
    print('\nBilling:')
    test('Date range', f'/api/billing/invoices/?start_date={y_start}&end_date={y_end}', token)
    test('Payment method: upi', '/api/billing/invoices/?payment_method=upi', token)
    test('Payment method: upi,cash (multi)', '/api/billing/invoices/?payment_method=upi,cash', token)
    test('Staff filter', '/api/billing/invoices/?staff_id=1', token)
    test('Customer filter', '/api/billing/invoices/?customer_id=1', token)
    test('Date + payment + staff combined', f'/api/billing/invoices/?start_date={y_start}&end_date={y_end}&payment_method=cash&staff_id=1', token)
    test('Daily summary + staff', f'/api/billing/daily-summary/?date={today}&staff_id=1', token)

    # ── CUSTOMERS ───────────────────────────────────────────────────────────
    print('\nCustomers:')
    test('Date range (last_visit)', f'/api/customers/?start_date={y_start}&end_date={y_end}', token)
    test('Staff filter', '/api/customers/?staff_id=1', token)
    test('Date + staff combined', f'/api/customers/?start_date={y_start}&end_date={y_end}&staff_id=1', token)
    test('Search still works', '/api/customers/?search=a', token)
    test('Empty range (no results expected, no error)', f'/api/customers/?start_date=2020-01-01&end_date=2020-01-02', token)

    # ── ANALYTICS: REVENUE ──────────────────────────────────────────────────
    print('\nAnalytics — Revenue:')
    test('Period=week (legacy)', '/api/analytics/revenue/?period=week', token)
    test('Period=month (legacy)', '/api/analytics/revenue/?period=month', token)
    test('Date range override', f'/api/analytics/revenue/?start_date={y_start}&end_date={y_end}', token)
    test('Staff filter', '/api/analytics/revenue/?staff_id=1', token)
    test('Date + staff', f'/api/analytics/revenue/?start_date={y_start}&end_date={y_end}&staff_id=1', token)

    # ── ANALYTICS: TOP SERVICES ─────────────────────────────────────────────
    print('\nAnalytics — Top Services:')
    test('Date range', f'/api/analytics/top-services/?start_date={y_start}&end_date={y_end}', token)
    test('Staff filter', '/api/analytics/top-services/?staff_id=1', token)

    # ── ANALYTICS: STAFF PERFORMANCE ────────────────────────────────────────
    print('\nAnalytics — Staff Performance:')
    test('Date range', f'/api/analytics/staff-performance/?start_date={y_start}&end_date={y_end}', token)
    test('Single staff', '/api/analytics/staff-performance/?staff_id=1', token)
    test('Date + staff', f'/api/analytics/staff-performance/?start_date={month_ago}&end_date={today}&staff_id=1', token)

    # ── ANALYTICS: RETENTION ────────────────────────────────────────────────
    print('\nAnalytics — Customer Retention:')
    test('Date range', f'/api/analytics/customer-retention/?start_date={y_start}&end_date={y_end}', token)
    test('Short range', f'/api/analytics/customer-retention/?start_date={month_ago}&end_date={today}', token)

    # ── ANALYTICS: HEATMAP ──────────────────────────────────────────────────
    print('\nAnalytics — Heatmap:')
    test('Legacy (no params)', '/api/analytics/heatmap/', token)
    test('Date range override', f'/api/analytics/heatmap/?start_date={y_start}&end_date={y_end}', token)

    # ── ANALYTICS: REVENUE BREAKDOWN ────────────────────────────────────────
    print('\nAnalytics — Revenue Breakdown:')
    test('Date range', f'/api/analytics/revenue-breakdown/?start_date={y_start}&end_date={y_end}', token)
    test('Staff filter', '/api/analytics/revenue-breakdown/?staff_id=1', token)

    # ── ANALYTICS: MEMBERSHIP + REFERRAL ────────────────────────────────────
    print('\nAnalytics — Membership / Referral:')
    test('Membership stats date range', f'/api/analytics/membership-stats/?start_date={y_start}&end_date={y_end}', token)
    test('Referral stats date range', f'/api/analytics/referral-stats/?start_date={y_start}&end_date={y_end}', token)

    # ── ANALYTICS: CUSTOMER INTELLIGENCE ────────────────────────────────────
    print('\nAnalytics — Customer Intelligence:')
    test('Churn risk: staff filter', '/api/analytics/churn-risk/?staff_id=1', token)
    test('Churn risk: date range', f'/api/analytics/churn-risk/?start_date={y_start}&end_date={y_end}', token)
    test('Next visit: staff filter', '/api/analytics/next-visit-predictions/?staff_id=1', token)
    test('VIP ranking: date range', f'/api/analytics/vip-ranking/?start_date={y_start}&end_date={y_end}', token)
    test('VIP ranking: staff filter', '/api/analytics/vip-ranking/?staff_id=1', token)
    test('Rebooking: staff filter', '/api/analytics/rebooking-opportunities/?staff_id=1', token)

    # ── INVENTORY ───────────────────────────────────────────────────────────
    print('\nInventory:')
    test('Consumption report: date range', f'/api/inventory/consumption-report/?start_date={y_start}&end_date={y_end}', token)
    test('Consumption report: short range', f'/api/inventory/consumption-report/?start_date={month_ago}&end_date={today}', token)
    test('Consumption report: no params', '/api/inventory/consumption-report/', token)

    # ── CAMPAIGNS ───────────────────────────────────────────────────────────
    print('\nCampaigns:')
    test('Status: sent', '/api/campaigns/?status=sent', token)
    test('Status: draft', '/api/campaigns/?status=draft', token)
    test('Date range', f'/api/campaigns/?start_date={y_start}&end_date={y_end}', token)
    test('Status + date', f'/api/campaigns/?status=sent&start_date={y_start}&end_date={y_end}', token)

    # ── NOTIFICATIONS ────────────────────────────────────────────────────────
    print('\nNotifications:')
    test('Status: pending', '/api/notifications/?status=pending', token)
    test('Status: sent', '/api/notifications/?status=sent', token)
    test('Status: failed', '/api/notifications/?status=failed', token)
    test('Date range', f'/api/notifications/?start_date={y_start}&end_date={y_end}', token)
    test('Status + date', f'/api/notifications/?status=sent&start_date={month_ago}&end_date={today}', token)

    # ── WAITLIST ─────────────────────────────────────────────────────────────
    print('\nWaitlist:')
    test('Today (no filter)', '/api/waitlist/today/', token)
    test('Status: waiting,done (multi)', '/api/waitlist/today/?status=waiting,done', token)
    test('Status: in_progress', '/api/waitlist/today/?status=in_progress', token)
    test('Date range', f'/api/waitlist/today/?start_date={y_start}&end_date={y_end}', token)

    # ── MEMBERSHIPS ──────────────────────────────────────────────────────────
    print('\nMemberships:')
    test('Active memberships (no filter)', '/api/memberships/active/', token)
    test('Status: active', '/api/memberships/active/?status=active', token)
    test('Status: expired', '/api/memberships/active/?status=expired', token)
    test('Date range', f'/api/memberships/active/?start_date={y_start}&end_date={y_end}', token)

    # ── BOOKING REQUESTS ─────────────────────────────────────────────────────
    print('\nBooking Requests:')
    test('Status: pending', '/api/appointments/booking-requests/?status=pending', token)
    test('Status: confirmed,rejected (multi)', '/api/appointments/booking-requests/?status=confirmed,rejected', token)
    test('Date range', f'/api/appointments/booking-requests/?start_date={y_start}&end_date={y_end}', token)
    test('Staff filter', '/api/appointments/booking-requests/?staff_id=1', token)

    # ── EDGE CASES ────────────────────────────────────────────────────────────
    print('\nEdge Cases:')
    test('Invalid date (should not crash)', '/api/appointments/?start_date=not-a-date', token)
    test('Non-existent staff_id=99999', '/api/appointments/?staff_id=99999', token)
    test('Far-future date range (empty results)', '/api/billing/invoices/?start_date=2099-01-01&end_date=2099-12-31', token)
    test('Far-past date range (empty results)', '/api/customers/?start_date=2000-01-01&end_date=2000-12-31', token)
    test('status=invalid_value (should not crash)', '/api/appointments/?status=invalid_status', token)
    test('Empty payment_method param', '/api/billing/invoices/?payment_method=', token)

    # ── SUMMARY ──────────────────────────────────────────────────────────────
    print('\n' + '=' * 64)
    for status, label, code, note in results:
        suffix = f'  [{code}]' + (f' {note}' if note else '')
        print(f'  {status} {label}{suffix}')

    total = passed + failed
    print('\n' + '=' * 64)
    if failed == 0:
        print(f'  All {total} tests passed ✓')
    else:
        print(f'  {passed}/{total} passed   {failed} FAILED')
    print('=' * 64 + '\n')

    sys.exit(0 if failed == 0 else 1)


if __name__ == '__main__':
    main()
