/**
 * @file Notifications management page.
 * Shows WhatsApp notification history with resend capability.
 */
import React, { useEffect, useState } from 'react'
import { getNotifications, resendNotification, getNotificationStats } from '../../api/notifications'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TYPE_LABELS = {
  booking_confirm: 'Booking Confirm',
  reminder_1hr: '1hr Reminder',
  review_request: 'Review Request',
  campaign: 'Campaign',
  referral_welcome: 'Referral Welcome',
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const FILTERS = ['all', 'pending', 'sent', 'failed']

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const [notifRes, statsRes] = await Promise.all([
        getNotifications(params),
        getNotificationStats(),
      ])
      setNotifications(notifRes.data.data || [])
      setStats(statsRes.data.data || null)
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filter])

  const handleResend = async (id) => {
    setResending(id)
    try {
      await resendNotification(id)
      toast.success('Notification queued for resend')
      fetchData()
    } catch {
      toast.error('Resend failed')
    } finally {
      setResending(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">WhatsApp Notifications</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-800' },
            { label: 'Sent', value: stats.sent, color: 'text-green-600' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
            { label: 'Failed', value: stats.failed, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value || 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm px-4 py-1.5 rounded-lg font-medium capitalize transition-colors ${
              filter === f ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No notifications found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notifications.map(n => (
                    <tr key={n.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {TYPE_LABELS[n.notification_type] || n.notification_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{n.customer_name}</td>
                      <td className="px-4 py-3 text-gray-600">{n.phone_number}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {n.scheduled_at ? format(new Date(n.scheduled_at), 'd MMM, h:mm a') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[n.status]}`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(n.status === 'failed' || n.status === 'pending') && (
                          <button
                            onClick={() => handleResend(n.id)}
                            disabled={resending === n.id}
                            className="text-xs bg-accent text-white px-3 py-1 rounded-lg disabled:opacity-60">
                            {resending === n.id ? '...' : 'Resend'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
