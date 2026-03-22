/**
 * @file Booking requests management page.
 * Staff reviews pending public booking requests and confirms or rejects.
 */
import React, { useEffect, useState } from 'react'
import { getBookingRequests, confirmBookingRequest, rejectBookingRequest } from '../../api/bookings'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FilterBar, useFilters, durationToDates } from '../../components/filters'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function BookingRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null) // {id, name}
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(null)

  const { filters, setFilters, clearFilters, toAPIParams, apiParamsString, hasActiveFilters } = useFilters({
    defaults: { duration: 'this_month', ...durationToDates('this_month'), status: 'pending' },
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = toAPIParams()
      if (filters.status) params.set('status', filters.status)
      const res = await getBookingRequests(params)
      setRequests(res.data.data || [])
    } catch { toast.error('Failed to load booking requests') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [apiParamsString])

  const handleConfirm = async (id) => {
    setProcessing(id)
    try {
      await confirmBookingRequest(id)
      toast.success('Booking confirmed and appointment created!')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm')
    } finally { setProcessing(null) }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setProcessing(rejectModal.id)
    try {
      await rejectBookingRequest(rejectModal.id, rejectReason)
      toast.success('Booking request rejected')
      setRejectModal(null)
      setRejectReason('')
      fetchData()
    } catch { toast.error('Failed to reject') }
    finally { setProcessing(null) }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Online Booking Requests</h1>
        {pendingCount > 0 && (
          <span className="bg-accent text-white text-xs px-2.5 py-1 rounded-full font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filter Bar — replaces old filter tabs */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        available={['duration', 'status', 'staff']}
        statusOptions={['pending', 'confirmed', 'rejected']}
        hasActive={hasActiveFilters}
      />

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
              No booking requests found
            </div>
          ) : requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800">{req.customer_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{req.customer_phone} {req.customer_email && `· ${req.customer_email}`}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {req.service_names?.map(s => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    📅 {req.preferred_date} at {req.preferred_time}
                    {req.preferred_stylist && ` · Stylist: ${req.preferred_stylist}`}
                  </p>
                  {req.notes && <p className="text-xs text-gray-400 mt-1">Note: {req.notes}</p>}
                  {req.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1">Reason: {req.rejection_reason}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Received: {format(new Date(req.created_at), 'd MMM yyyy, h:mm a')}
                  </p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleConfirm(req.id)} disabled={processing === req.id}
                      className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60">
                      Confirm
                    </button>
                    <button onClick={() => setRejectModal({ id: req.id, name: req.customer_name })}
                      className="text-sm border border-red-200 text-red-500 px-4 py-2 rounded-lg font-medium hover:bg-red-50">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Reject Booking</h2>
            <p className="text-sm text-gray-500 mb-4">Reason for rejecting {rejectModal.name}'s request?</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              rows={3} placeholder="e.g. Fully booked on that day"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent mb-3" />
            <div className="flex gap-2">
              <button onClick={handleReject} disabled={processing === rejectModal.id}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {processing === rejectModal.id ? 'Rejecting...' : 'Reject'}
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
