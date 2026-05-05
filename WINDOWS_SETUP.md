# Salon App — Windows Setup Guide

Complete setup, user management, and maintenance reference.

---

## PART A — FRESH INSTALLATION

### Step 1 — Install Python 3.11

1. Go to: https://www.python.org/downloads/release/python-3119/
2. Scroll down, click **Windows installer (64-bit)**
3. Run the installer
4. **IMPORTANT:** Check **"Add Python to PATH"** before clicking Install
5. Click **Install Now** → **Close**

Verify in Command Prompt (`Win + R` → type `cmd` → Enter):
```
python --version
```
You should see `Python 3.11.x`

---

### Step 2 — Install Node.js

1. Go to: https://nodejs.org/en/download
2. Click **Windows Installer (.msi) — LTS version**
3. Run the installer, keep all defaults → **Finish**

Verify:
```
node --version
npm --version
```

---

### Step 3 — Copy the App Files

Copy the entire `salon-app` folder to the laptop.
Put it at: `C:\salon-app`

Use a USB drive or zip file.

---

### Step 4 — Set Up the Backend

Open **Command Prompt** and run these one by one:

```
cd C:\salon-app\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
```

You should see `(venv)` at the start of the prompt after activation.

---

### Step 5 — Create the Admin User

While still in the backend folder with venv active:

```
python manage.py shell
```

Inside the shell, paste this (replace name/password as needed):

```python
from apps.accounts.models import StaffMember
u = StaffMember.objects.create_superuser(
    username='admin',
    password='demo1234',
    email='admin@salon.com',
    full_name='Salon Admin',
    role='owner'
)
print('Admin created:', u.username)
exit()
```

---

### Step 6 — Set Up the Frontend

Open a **second Command Prompt window**:

```
cd C:\salon-app\frontend
npm install
```

---

### Step 7 — Start the App

You need **two Command Prompt windows** running at the same time.

**Window 1 — Backend:**
```
cd C:\salon-app\backend
venv\Scripts\activate
python manage.py runserver 8001
```

You should see: `Starting development server at http://127.0.0.1:8001/`

**Window 2 — Frontend:**
```
cd C:\salon-app\frontend
npm run dev
```

You should see: `Local: http://localhost:5173/`

---

### Step 8 — Open the App

Open Chrome and go to: **http://localhost:5173**

---

## PART B — USER MANAGEMENT

All user commands run inside the Django shell.  
Always activate venv first:

```
cd C:\salon-app\backend
venv\Scripts\activate
python manage.py shell
```

---

### Create a New Admin / Owner

```python
from apps.accounts.models import StaffMember
StaffMember.objects.create_superuser(
    username='admin',
    password='demo1234',
    email='admin@salon.com',
    full_name='Salon Owner',
    role='owner'
)
exit()
```

---

### Create a Staff Member (non-admin)

```python
from apps.accounts.models import StaffMember
StaffMember.objects.create_user(
    username='priya',
    password='staff123',
    full_name='Priya Sharma',
    role='stylist'
)
exit()
```

Role options: `owner`, `manager`, `stylist`, `receptionist`

---

### List All Users

```python
from apps.accounts.models import StaffMember
for u in StaffMember.objects.all():
    print(u.username, '|', u.full_name, '|', u.role, '| active:', u.is_active)
exit()
```

---

### Reset a User's Password

```python
from apps.accounts.models import StaffMember
u = StaffMember.objects.get(username='admin')
u.set_password('newpassword123')
u.save()
print('Password updated')
exit()
```

---

### Delete a User

```python
from apps.accounts.models import StaffMember
StaffMember.objects.get(username='priya').delete()
print('Deleted')
exit()
```

---

### Disable a User (without deleting)

```python
from apps.accounts.models import StaffMember
u = StaffMember.objects.get(username='priya')
u.is_active = False
u.save()
exit()
```

---

## PART C — WIPE & RESET DATA

### Delete All Billing / Invoice Data Only

```
cd C:\salon-app\backend
venv\Scripts\activate
python manage.py shell
```

```python
from apps.billing.models import Invoice, InvoiceItem
InvoiceItem.objects.all().delete()
Invoice.objects.all().delete()
print('All invoices deleted')
exit()
```

---

### Delete All Customers Only

```python
from apps.customers.models import Customer
Customer.objects.all().delete()
print('All customers deleted')
exit()
```

---

### Delete All Appointments Only

```python
from apps.appointments.models import Appointment
Appointment.objects.all().delete()
print('All appointments deleted')
exit()
```

---

### Wipe Everything — Complete Fresh Start

This deletes the entire database and recreates it blank.

```
cd C:\salon-app\backend
venv\Scripts\activate
```

Delete the database file:
```
del db.sqlite3
```

Recreate all tables:
```
python manage.py migrate
```

Create admin again:
```
python manage.py shell
```

```python
from apps.accounts.models import StaffMember
StaffMember.objects.create_superuser(
    username='admin',
    password='demo1234',
    email='admin@salon.com',
    full_name='Salon Admin',
    role='owner'
)
print('Done')
exit()
```

---

### Full Reinstall — Delete Everything Including Dependencies

Use this if the app is broken and you want to start from absolute zero.

```
cd C:\salon-app\backend
venv\Scripts\activate
deactivate
```

Delete backend environment and database:
```
cd C:\salon-app\backend
rmdir /s /q venv
del db.sqlite3
```

Delete frontend packages:
```
cd C:\salon-app\frontend
rmdir /s /q node_modules
```

Now follow **Part A Steps 4–8** again from scratch.

---

## PART D — DAILY STARTUP

Every time you start the laptop, run this:

**Window 1:**
```
cd C:\salon-app\backend
venv\Scripts\activate
python manage.py runserver 8001
```

**Window 2:**
```
cd C:\salon-app\frontend
npm run dev
```

Open Chrome → **http://localhost:5173**

---

## PART E — TROUBLESHOOTING

**"python is not recognized"**
- You forgot to check "Add Python to PATH" during install
- Fix: uninstall Python and reinstall, checking that box

**"venv\Scripts\activate" fails in PowerShell**
```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Then try activate again. (Not needed in CMD.)

**"pip install fails"**
```
pip install --upgrade pip
pip install -r requirements.txt
```

**Port already in use**
- Backend: change `runserver 8001` to `runserver 8002`
- Frontend: open `frontend\vite.config.js`, change `port: 5173` to `port: 5174` and `target` to `http://127.0.0.1:8002`

**App loads but login fails**
- Both windows must be running
- Run the Reset Password command in Part B

**Windows Defender blocks Python**
- Click "Allow access" when prompted
- Or temporarily disable real-time protection during setup

---

## Quick Reference

| What                | Command / Value                       |
|---------------------|---------------------------------------|
| Start backend       | `python manage.py runserver 8001`     |
| Start frontend      | `npm run dev`                         |
| App URL             | http://localhost:5173                 |
| Default login       | admin / demo1234                      |
| Backend API         | http://localhost:8001/api/            |
| Database file       | `C:\salon-app\backend\db.sqlite3`     |
| Open Django shell   | `python manage.py shell`              |
| Wipe DB             | `del db.sqlite3` then `python manage.py migrate` |
