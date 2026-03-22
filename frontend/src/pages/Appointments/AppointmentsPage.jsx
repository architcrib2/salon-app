/**
 * @file Appointments page.
 * Day calendar view with columns per stylist, rows per hour (9AM–9PM).
 * Colour-coded by status. Click to create or view appointments.
 * Date picker to navigate days.
 */
import React, { useEffect, useState, useCallback } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { getAppointmentCalendar, createAppointment, updateAppointment } from '../../api/appointments'
import { getStaff } from '../../api/staff'
import { getCustomers } from '../../api/customers'
import { getServices } from '../../api/services'
import Badge from '../../components/Badge'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FilterBar, useFilters, durationToDates } from '../../components/filters'
import toast from 'react-hot-toast'

/** Hours displayed in calendar (9AM to 9PM) */
const HOURS = Array.from({ length: 13 }, (_, i) => i + 9)

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
  in_progress: 'bg-amber-100 border-amber-300 text-amber-800',
  completed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-600',
  no_show: 'bg-red-100 border-red-300 text-red-700',
}

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateStr = format(currentDate, 'yyyy-MM-dd')

  const { filters, setFilters, clearFilters, toAPIParams, apiParamsString, hasActiveFilters } = useFilters({
    defaults: { duration: 'today', ...durationToDates('today') },
  })

  const [appointments, setAppointments] = useState([])
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null) // { stylist, hour }

  // Form state
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState({
    customer: '', stylist: '', service_ids: [], scheduled_at: '', notes: ''
  })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Pass staff_id filter to calendar if set
      const calParams = new URLSearchParams()
      if (filters.staff_id) calParams.set('staff_id', filters.staff_id)

      const [calRes, staffRes] = await Promise.all([
        getAppointmentCalendar(dateStr, calParams.toString() ? calParams : undefined),
        getStaff(),
      ])
      setAppointments(calRes.data.data || [])
      setStylists((staffRes.data.data || []).filter(s => s.role === 'stylist' || s.role === 'owner'))
    } catch {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [dateStr, apiParamsString])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    getCustomers().then(res => setCustomers(res.data.data || []))
    getServices({ active: true }).then(res => setServices(res.data.data || []))
  }, [])

  // Client-side status filter
  const activeStatuses = filters.status ? filters.status.split(',').filter(Boolean) : []
  const displayedAppointments = activeStatuses.length > 0
    ? appointments.filter(a => activeStatuses.includes(a.status))
    : appointments

  const handleSlotClick = (stylistId, hour) => {
    const dt = format(currentDate, 'yyyy-MM-dd') + `T${String(hour).padStart(2, '0')}:00`
    setSelectedSlot({ stylist: stylistId, hour })
    setForm({ customer: '', stylist: stylistId, service_ids: [], scheduled_at: dt, notes: '' })
    setShowCreateModal(true)
  }

  const handleApptClick = (appt, e) => {
    e.stopPropagation()
    setSelectedAppt(appt)
    setShowDetailModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.customer || !form.stylist || form.service_ids.length === 0) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      // Calculate total duration from selected services
      const selectedSvcs = services.filter(s => form.service_ids.includes(s.id))
      const duration = selectedSvcs.reduce((sum, s) => sum + s.duration_minutes, 0)
      await createAppointment({ ...form, duration_minutes: duration })
      toast.success('Appointment booked!')
      setShowCreateModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create appointment')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (apptId, newStatus) => {
    try {
      await updateAppointment(apptId, { status: newStatus })
      toast.success('Status updated')
      setShowDetailModal(false)
      fetchData()
    } catch {
      toast.error('Failed to update status')
    }
  }

  /** Get appointments for a specific stylist + hour slot */
  const getSlotAppts = (stylistId, hour) => {
    return displayedAppointments.filter(appt => {
      if (appt.stylist !== stylistId) return false
      const apptHour = new Date(appt.scheduled_at).getHours()
      return apptHour === hour
    })
  }

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
        <button
          onClick={() => setCurrentDate(subDays(currentDate, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          ←
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-800">{format(currentDate, 'EEEE, d MMMM yyyy')}</p>
          <p className="text-xs text-gray-400">{displayedAppointments.length} appointment{displayedAppointments.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCurrentDate(addDays(currentDate, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          →
        </button>
      </div>

      {/* Today button */}
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-sm bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-dark transition-colors font-medium"
        >
          Today
        </button>
        <input
          type="date"
          value={dateStr}
          onChange={e => setCurrentDate(new Date(e.target.value + 'T00:00:00'))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        available={['duration', 'staff', 'status']}
        statusOptions={['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']}
        hasActive={hasActiveFilters}
      />

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Calendar grid */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${Math.max(600, stylists.length * 180 + 80)}px` }}>
              {/* Header row — stylist names */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <div className="w-20 flex-shrink-0 px-3 py-3 text-xs font-medium text-gray-500">Time</div>
                {stylists.map(stylist => (
                  <div key={stylist.id} className="flex-1 px-3 py-3 text-center border-l border-gray-200">
                    <p className="text-sm font-semibold text-gray-700">{stylist.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{stylist.role}</p>
                  </div>
                ))}
              </div>

              {/* Hour rows */}
              {HOURS.map(hour => (
                <div key={hour} className="flex border-b border-gray-100 hover:bg-gray-50/30">
                  <div className="w-20 flex-shrink-0 px-3 py-3 text-xs text-gray-400 font-medium">
                    {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                  </div>
                  {stylists.map(stylist => {
                    const slotAppts = getSlotAppts(stylist.id, hour)
                    return (
                      <div
                        key={stylist.id}
                        className="flex-1 border-l border-gray-100 px-2 py-1 min-h-[56px] cursor-pointer hover:bg-blue-50/50 transition-colors"
                        onClick={() => handleSlotClick(stylist.id, hour)}
                      >
                        {slotAppts.map(appt => (
                          <div
                            key={appt.id}
                            onClick={e => handleApptClick(appt, e)}
                            className={`text-xs rounded-md px-2 py-1 mb-1 border cursor-pointer hover:opacity-80 ${STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled}`}
                          >
                            <p className="font-semibold truncate">{appt.customer_name}</p>
                            <p className="truncate opacity-75">{appt.service_names?.[0]}</p>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <span key={status} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${cls}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {status.replace('_', ' ')}
          </span>
        ))}
      </div>

      {/* Create Appointment Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Book Appointment" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                value={form.customer}
                onChange={e => setForm({ ...form, customer: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stylist *</label>
              <select
                value={form.stylist}
                onChange={e => setForm({ ...form, stylist: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              >
                <option value="">Select stylist...</option>
                {stylists.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Services multi-select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Services * (select one or more)</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {services.map(svc => (
                <label key={svc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={form.service_ids.includes(svc.id)}
                    onChange={e => {
                      const ids = e.target.checked
                        ? [...form.service_ids, svc.id]
                        : form.service_ids.filter(id => id !== svc.id)
                      setForm({ ...form, service_ids: ids })
                    }}
                    className="accent-accent"
                  />
                  <span className="text-gray-700">{svc.name}</span>
                  <span className="text-gray-400 text-xs ml-auto">₹{svc.price}</span>
                </label>
              ))}
            </div>
            {form.service_ids.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {form.service_ids.length} service{form.service_ids.length > 1 ? 's' : ''} selected ·
                Est. {services.filter(s => form.service_ids.includes(s.id)).reduce((sum, s) => sum + s.duration_minutes, 0)} min ·
                ₹{services.filter(s => form.service_ids.includes(s.id)).reduce((sum, s) => sum + Number(s.price), 0).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
            >
              {saving ? 'Booking...' : 'Book Appointment'}
            </button>
            <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Appointment Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-medium">{selectedAppt.customer_name}</p>
                <p className="text-xs text-gray-400">{selectedAppt.customer_phone}</p>
              </div>
              <div>
                <p className="text-gray-500">Stylist</p>
                <p className="font-medium">{selectedAppt.stylist_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Time</p>
                <p className="font-medium">{format(new Date(selectedAppt.scheduled_at), 'h:mm a, d MMM')}</p>
              </div>
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-medium">{selectedAppt.duration_minutes} min</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Services</p>
                <p className="font-medium">{selectedAppt.service_names?.join(', ')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Status</p>
                <Badge label={selectedAppt.status.replace('_', ' ')} variant={selectedAppt.status} />
              </div>
            </div>

            {/* Status change buttons */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedAppt.id, s)}
                    disabled={selectedAppt.status === s}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedAppt.status === s
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
