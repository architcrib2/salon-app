/**
 * @file Dashboard page.
 * Shows today's summary stats, appointment timeline, low-stock alerts,
 * and quick action buttons. Fetches data from billing daily-summary
 * and appointments calendar endpoints.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { getDailySummary } from '../../api/billing'
import { getAppointmentCalendar, getAppointments } from '../../api/appointments'
import { getProducts } from '../../api/inventory'
import StatCard from '../../components/StatCard'
import Badge from '../../components/Badge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FilterBar, useFilters, durationToDates } from '../../components/filters'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { filters, setFilters, clearFilters, toAPIParams, apiParamsString, hasActiveFilters } = useFilters({
    defaults: { duration: 'today', ...durationToDates('today') },
  })

  const [summary, setSummary] = useState(null)
  const [appointments, setAppointments] = useState([])   // today's calendar (for timeline)
  const [periodAppts, setPeriodAppts] = useState([])     // filter-period appointments (for stats)
  const [lowStock, setLowStock] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const params = toAPIParams()  // URLSearchParams with start_date, end_date, staff_id

        const [summaryRes, todayCalRes, periodApptsRes, invRes] = await Promise.all([
          getDailySummary(today, params),               // revenue summary for selected period
          getAppointmentCalendar(today),                // today's calendar (always today for timeline)
          getAppointments(Object.fromEntries(params)),  // appointments for selected period (for counts)
          getProducts({ low_stock: true }),
        ])

        setSummary(summaryRes.data.data)
        setAppointments(todayCalRes.data.data || [])
        setPeriodAppts(periodApptsRes.data.data || [])
        setLowStock(invRes.data.low_stock_count || 0)
      } catch (err) {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [today, apiParamsString])

  if (loading) return <LoadingSpinner message="Loading dashboard..." />

  const totalRevenue = summary?.total_revenue || 0
  const totalInvoices = summary?.total_invoices || 0
  // Stats use period appointments (matches the selected date range)
  const pendingAppts = periodAppts.filter(a => a.status === 'scheduled').length
  const completedAppts = periodAppts.filter(a => a.status === 'completed').length
  const uniqueCustomers = new Set(periodAppts.map(a => a.customer)).size

  // Label helpers: show "Today" when default filter, otherwise "Period"
  const isToday = !hasActiveFilters || filters.duration === 'today'
  const periodLabel = isToday ? "Today's" : 'Period'

  return (
    <div className="space-y-6">
      {/* Low stock alert banner */}
      {lowStock > 0 && (
        <div
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => navigate('/inventory')}
        >
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm font-medium text-red-700">
              {lowStock} product{lowStock > 1 ? 's' : ''} below reorder level — restock soon
            </p>
          </div>
          <span className="text-red-500 text-sm font-medium">View →</span>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        available={['duration', 'staff']}
        hasActive={hasActiveFilters}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="💰"
          label={`${periodLabel} Revenue`}
          value={`₹${Number(totalRevenue).toLocaleString('en-IN')}`}
          sub={`${totalInvoices} invoice${totalInvoices !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon="📅"
          label="Appointments"
          value={isToday ? appointments.length : periodAppts.length}
          sub={`${completedAppts} completed`}
        />
        <StatCard
          icon="⏳"
          label="Pending"
          value={pendingAppts}
          sub="scheduled"
        />
        <StatCard
          icon="👥"
          label={`${periodLabel} Customers`}
          value={uniqueCustomers}
          sub="unique visitors"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/appointments')}
          className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          ➕ New Appointment
        </button>
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          👤 New Customer
        </button>
        <button
          onClick={() => navigate('/billing/new')}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          🧾 Create Invoice
        </button>
        <button
          onClick={() => navigate('/billing/walkin')}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ⚡ Quick Bill
        </button>
      </div>

      {/* Today's appointments timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Today's Appointments</h2>
          <button
            onClick={() => navigate('/appointments')}
            className="text-sm text-accent hover:text-accent-dark font-medium"
          >
            View all →
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-4xl mb-2">📅</p>
            <p className="text-gray-500 text-sm">No appointments today</p>
            <button
              onClick={() => navigate('/appointments')}
              className="mt-3 text-accent text-sm font-medium hover:underline"
            >
              Book one →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.slice(0, 10).map(appt => (
              <div key={appt.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Status colour dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    appt.status === 'completed' ? 'bg-green-500' :
                    appt.status === 'in_progress' ? 'bg-amber-500' :
                    appt.status === 'cancelled' ? 'bg-gray-400' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{appt.customer_name}</p>
                    <p className="text-xs text-gray-400">
                      {appt.stylist_name} · {appt.service_names?.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {format(new Date(appt.scheduled_at), 'h:mm a')}
                  </span>
                  <Badge label={appt.status.replace('_', ' ')} variant={appt.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue by payment method */}
      {summary?.by_payment_method?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{periodLabel} Revenue by Method</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summary.by_payment_method.map(item => (
              <div key={item.payment_method} className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 capitalize mb-1">{item.payment_method}</p>
                <p className="text-lg font-bold text-gray-800">₹{Number(item.total).toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400">{item.count} txn</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
