/**
 * @file WhatsApp campaigns management page.
 * Create targeted campaigns by customer segment, preview reach, and send.
 */
import React, { useEffect, useState } from 'react'
import { getCampaigns, createCampaign, sendCampaign, previewSegment } from '../../api/campaigns'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const SEGMENT_LABELS = {
  lapsed_60: 'Not visited 60+ days',
  lapsed_30: 'Not visited 30+ days',
  loyalty_low: 'Low loyalty points',
  new_customers: 'New customers (30d)',
  all: 'All customers',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', target_segment: 'lapsed_60', message_template: '' })
  const [previewCount, setPreviewCount] = useState(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(null)
  const [confirmSend, setConfirmSend] = useState(null) // campaign

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await getCampaigns()
      setCampaigns(res.data.data || [])
    } catch { toast.error('Failed to load campaigns') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [])

  useEffect(() => {
    if (!form.target_segment) return
    previewSegment(form.target_segment)
      .then(res => setPreviewCount(res.data.data?.count ?? null))
      .catch(() => setPreviewCount(null))
  }, [form.target_segment])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.message_template) {
      toast.error('Name and message required')
      return
    }
    setSaving(true)
    try {
      await createCampaign(form)
      toast.success('Campaign created')
      setShowCreate(false)
      setForm({ name: '', target_segment: 'lapsed_60', message_template: '' })
      fetchCampaigns()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create') }
    finally { setSaving(false) }
  }

  const handleSend = async (campaign) => {
    setSending(campaign.id)
    try {
      const res = await sendCampaign(campaign.id)
      toast.success(res.data.message || `Sent to ${campaign.total_recipients || 0} customers`)
      setConfirmSend(null)
      fetchCampaigns()
    } catch (err) { toast.error(err.response?.data?.message || 'Send failed') }
    finally { setSending(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">WhatsApp Campaigns</h1>
        <button onClick={() => setShowCreate(v => !v)}
          className="text-sm bg-accent text-white px-4 py-2 rounded-lg font-medium">
          {showCreate ? '✕ Cancel' : '+ New Campaign'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Create Campaign</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Name</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Monsoon Reactivation"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target Segment</label>
              <select value={form.target_segment}
                onChange={e => setForm(p => ({ ...p, target_segment: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                {Object.entries(SEGMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {previewCount !== null && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Preview: {previewCount} customer{previewCount !== 1 ? 's' : ''} in this segment
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Message Template
                <span className="text-gray-400 font-normal ml-1">— use {'{name}'}, {'{last_visit}'}, {'{offer}'}</span>
              </label>
              <textarea required value={form.message_template}
                onChange={e => setForm(p => ({ ...p, message_template: e.target.value }))}
                rows={4}
                placeholder="Hi {name}! We miss you at KaratOS Salon. Book now and get 10% off with code {offer}. Your last visit was on {last_visit}."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns list */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {campaigns.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No campaigns yet. Create your first one!</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {campaigns.map(c => (
                <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        c.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{c.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {SEGMENT_LABELS[c.target_segment] || c.target_segment}
                      {c.total_recipients > 0 && ` · ${c.total_recipients} recipients`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created {format(new Date(c.created_at), 'd MMM yyyy')}
                      {c.sent_at && ` · Sent ${format(new Date(c.sent_at), 'd MMM, h:mm a')}`}
                    </p>
                  </div>
                  {c.status === 'draft' && (
                    <button onClick={() => setConfirmSend(c)}
                      className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium shrink-0">
                      Send
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm Send Modal */}
      {confirmSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">📤</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Send Campaign?</h2>
            <p className="text-sm text-gray-500 mb-1">
              "<span className="font-medium">{confirmSend.name}</span>"
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Segment: {SEGMENT_LABELS[confirmSend.target_segment]}
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleSend(confirmSend)} disabled={sending === confirmSend.id}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {sending === confirmSend.id ? 'Sending...' : 'Yes, Send Now'}
              </button>
              <button onClick={() => setConfirmSend(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
