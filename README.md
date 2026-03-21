# Salon Management App

A full-stack salon management system for the Indian market. Built with Django REST Framework + React (Vite).

## Run in 3 steps

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python ../seed.py
python manage.py runserver 8001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Demo Login
- **URL:** http://localhost:5173
- **Username:** admin
- **Password:** demo1234

## Key Features

- **Dashboard** — Today's revenue, appointments timeline, low-stock alerts
- **Appointments** — Day calendar view per stylist with slot blocking (9AM–9PM)
- **Customers** — Search by name/phone, loyalty points, visit history
- **Billing** — GST-compliant invoices, UPI/Cash/Card payment tracking
- **Services** — Catalogue with categories, duration, pricing, 18% GST
- **Inventory** — Stock tracking with low-stock alerts and restock actions
- **Analytics** — Revenue charts, top services, staff performance (owner only)
- **Staff** — Role-based access: Owner / Stylist / Receptionist

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Django 4.2, DRF, SimpleJWT |
| Database | SQLite (zero-setup demo) |
| Frontend | React 18, Vite, Tailwind CSS |
| Charts | Recharts |
| Auth | JWT (access 8h, refresh 7d) |

## API Base URL
`http://localhost:8001/api/`

## Roles
- **Owner** — Full access including analytics and staff management
- **Stylist** — Appointments, billing, customers
- **Receptionist** — Bookings and customer management
