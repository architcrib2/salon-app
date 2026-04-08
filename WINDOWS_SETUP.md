# Salon App — Windows Installation Guide

Complete setup from scratch. Follow every step in order.

---

## Step 1 — Install Python 3.11

1. Go to: https://www.python.org/downloads/release/python-3119/
2. Scroll down, click **Windows installer (64-bit)**
3. Run the installer
4. **IMPORTANT:** Check the box **"Add Python to PATH"** before clicking Install
5. Click **Install Now**
6. When done, click **Close**

Verify: open **Command Prompt** (press `Win + R`, type `cmd`, press Enter) and run:
```
python --version
```
You should see `Python 3.11.x`

---

## Step 2 — Install Node.js

1. Go to: https://nodejs.org/en/download
2. Click **Windows Installer (.msi) — LTS version**
3. Run the installer, click Next through all steps, keep defaults
4. Click **Install**, then **Finish**

Verify in Command Prompt:
```
node --version
npm --version
```

---

## Step 3 — Copy the App Files

Copy the entire `salon-app` folder to the client laptop.  
For example, put it at: `C:\salon-app`

You can use a USB drive or zip file.

---

## Step 4 — Set Up the Backend

Open **Command Prompt** and run these commands one by one:

```
cd C:\salon-app\backend
```

Create a virtual environment:
```
python -m venv venv
```

Activate it:
```
venv\Scripts\activate
```

You should see `(venv)` at the start of your prompt.

Install dependencies:
```
pip install -r requirements.txt
```

Set up the database:
```
python manage.py migrate
```

Load demo data (creates sample customers, services, appointments):
```
cd C:\salon-app
python seed.py
```

---

## Step 5 — Set Up the Frontend

Open a **second Command Prompt window** and run:

```
cd C:\salon-app\frontend
npm install
```

---

## Step 6 — Start the App

You need **two Command Prompt windows** running at the same time.

### Window 1 — Backend

```
cd C:\salon-app\backend
venv\Scripts\activate
python manage.py runserver 8001
```

Leave this window open. You should see:
```
Starting development server at http://127.0.0.1:8001/
```

### Window 2 — Frontend

```
cd C:\salon-app\frontend
npm run dev
```

Leave this window open. You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## Step 7 — Open the App

Open any browser (Chrome recommended) and go to:

```
http://localhost:5173
```

---

## Login Credentials

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `demo1234` |

---

## Troubleshooting

**"python is not recognized"**
- You forgot to check "Add Python to PATH" during install
- Fix: uninstall Python and reinstall, making sure to check that box

**"venv\Scripts\activate is not recognized"**
- Run this first: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- Then try again (only needed in PowerShell, not CMD)

**"pip install fails on Pillow"**
- Run: `pip install --upgrade pip` then retry `pip install -r requirements.txt`

**Port already in use error**
- Something else is using port 8001 or 5173
- Backend: change `runserver 8001` to `runserver 8002`
- Frontend: edit `frontend/vite.config.js`, change `port: 5173` to `port: 5174`
- Also update `target: 'http://127.0.0.1:8002'` in vite.config.js if you changed the backend port

**App loads but shows blank/login fails**
- Make sure both windows (backend + frontend) are still running
- Check that the backend window shows no red errors

**Windows Defender / Antivirus blocks Python**
- Click "Allow access" when prompted
- Or temporarily disable real-time protection during install

---

## Every Time You Start the App

You don't need to redo Steps 1–5. Just:

1. Open Window 1 → `cd C:\salon-app\backend` → `venv\Scripts\activate` → `python manage.py runserver 8001`
2. Open Window 2 → `cd C:\salon-app\frontend` → `npm run dev`
3. Open browser → `http://localhost:5173`

---

## Quick Reference

| What          | Command / URL                        |
|---------------|--------------------------------------|
| Start backend | `python manage.py runserver 8001`    |
| Start frontend| `npm run dev`                        |
| App URL       | http://localhost:5173                |
| Admin login   | admin / demo1234                     |
| Backend API   | http://localhost:8001/api/           |
| Database file | `C:\salon-app\backend\db.sqlite3`    |
