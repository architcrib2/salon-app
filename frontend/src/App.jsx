/**
 * @file Root application component.
 * Defines all routes, wraps protected pages in MainLayout.
 * Uses React Router v6 with nested routes.
 */
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import MainLayout from './components/MainLayout'

// Pages
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import AppointmentsPage from './pages/Appointments/AppointmentsPage'
import CustomersPage from './pages/Customers/CustomersPage'
import CustomerDetailPage from './pages/Customers/CustomerDetailPage'
import BillingPage from './pages/Billing/BillingPage'
import CreateInvoicePage from './pages/Billing/CreateInvoicePage'
import InvoiceDetailPage from './pages/Billing/InvoiceDetailPage'
import ServicesPage from './pages/Services/ServicesPage'
import InventoryPage from './pages/Inventory/InventoryPage'
import AnalyticsPage from './pages/Analytics/AnalyticsPage'
import StaffPage from './pages/Staff/StaffPage'
// Phase 2 pages
import NotificationsPage from './pages/Notifications/NotificationsPage'
import MembershipsPage from './pages/Memberships/MembershipsPage'
import WaitlistPage from './pages/Waitlist/WaitlistPage'
import BookingRequestsPage from './pages/Bookings/BookingRequestsPage'
import CampaignsPage from './pages/Campaigns/CampaignsPage'
// Phase 3 pages
import IntelligencePage from './pages/Analytics/IntelligencePage'
import WalkinBillingPage from './pages/Billing/WalkinBillingPage'
// Public pages (no auth / no sidebar)
import QueueDisplayPage from './pages/Waitlist/QueueDisplayPage'
import OnlineBookingPage from './pages/Bookings/OnlineBookingPage'

/** Redirect unauthenticated users to /login */
function ProtectedRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Public pages — no auth, no sidebar */}
      <Route path="/queue-display" element={<QueueDisplayPage />} />
      <Route path="/book" element={<OnlineBookingPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/new" element={<CreateInvoicePage />} />
        <Route path="billing/:id" element={<InvoiceDetailPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="staff" element={<StaffPage />} />
        {/* Phase 2 — Engagement */}
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="memberships" element={<MembershipsPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="booking-requests" element={<BookingRequestsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        {/* Phase 3 — Intelligence + Walk-in */}
        <Route path="analytics/intelligence" element={<IntelligencePage />} />
        <Route path="billing/walkin" element={<WalkinBillingPage />} />
      </Route>
    </Routes>
  )
}
