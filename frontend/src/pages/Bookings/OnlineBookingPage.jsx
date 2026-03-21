/**
 * @file Public online booking wizard.
 * 4-step flow: Services → Stylist+Time → Contact → Confirmation
 * No auth required — public facing page.
 */
import React, { useEffect, useState } from 'react'
import { getPublicServices, getPublicStylists, submitBookingRequest } from '../../api/bookings'

const STEPS = ['Services', 'Stylist & Time', 'Contact', 'Confirm']

function generateTimeSlots() {
  const slots = []
  for (let h = 9; h <= 20; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
    slots.push(`${h.toString().padStart(2, '0')}:30`)
  }
  slots.push('21:00')
  return slots
}

function generateDates() {
  const dates = []
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export default function OnlineBookingPage() {
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState([])
  const [stylists, setStylists] = useState([])
  const [selectedServices, setSelectedServices] = useState([]) // [{id, name, price, duration}]
  const [stylistId, setStylistId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [contact, setContact] = useState({ name: '', phone: '', email: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    Promise.all([getPublicServices(), getPublicStylists()])
      .then(([svcRes, stylistRes]) => {
        setCategories(svcRes.data.data || [])
        setStylists(stylistRes.data.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleService = (svc) => {
    setSelectedServices(prev =>
      prev.find(s => s.id === svc.id)
        ? prev.filter(s => s.id !== svc.id)
        : [...prev, svc]
    )
  }

  const totalPrice = selectedServices.reduce((s, svc) => s + Number(svc.price), 0)
  const totalDuration = selectedServices.reduce((s, svc) => s + svc.duration_minutes, 0)

  const handleSubmit = async () => {
    if (!contact.name || !contact.phone) return
    setSubmitting(true)
    try {
      await submitBookingRequest({
        customer_name: contact.name,
        customer_phone: contact.phone,
        customer_email: contact.email,
        service_ids: selectedServices.map(s => s.id),
        preferred_stylist_id: stylistId || null,
        preferred_date: date,
        preferred_time: time,
        notes: contact.notes,
      })
      setSubmitted(true)
    } catch {
      alert('Failed to submit booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Requested!</h2>
          <p className="text-gray-500">We'll confirm your appointment via WhatsApp shortly.</p>
          <p className="text-sm text-gray-400 mt-3">KaratOS Salon · {contact.phone}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <span className="text-2xl">✂️</span>
          <div>
            <p className="font-bold">KaratOS Salon</p>
            <p className="text-white/50 text-xs">Online Booking</p>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-3 flex gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs font-medium ${
              i === step ? 'text-[#e94560]' : i < step ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? 'bg-green-600 text-white' :
                i === step ? 'bg-[#e94560] text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="hidden sm:inline">{s}</span>
              {i < STEPS.length - 1 && <span className="text-gray-200 ml-1">›</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Step 1: Services */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Select Services</h2>
                {categories.map(cat => (
                  <div key={cat.category}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{cat.category}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.services.map(svc => {
                        const selected = selectedServices.find(s => s.id === svc.id)
                        return (
                          <button key={svc.id} onClick={() => toggleService(svc)}
                            className={`text-left p-3 rounded-xl border-2 transition-colors ${
                              selected ? 'border-[#e94560] bg-[#e94560]/5' : 'border-gray-100 hover:border-gray-300'
                            }`}>
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-gray-800 text-sm">{svc.name}</span>
                              {selected && <span className="text-[#e94560] text-sm">✓</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{svc.duration_minutes} min · ₹{Number(svc.price).toLocaleString('en-IN')}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {selectedServices.length > 0 && (
                  <div className="bg-[#e94560]/10 rounded-xl p-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-[#e94560]">{selectedServices.length} service(s) · {totalDuration} min · ₹{totalPrice.toLocaleString('en-IN')}</p>
                    <button onClick={() => setStep(1)}
                      className="bg-[#e94560] text-white px-4 py-1.5 rounded-lg text-sm font-medium">
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Stylist & Time */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Choose Stylist & Time</h2>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Preferred Stylist</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button onClick={() => setStylistId('')}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        stylistId === '' ? 'border-[#e94560] bg-[#e94560]/5 text-[#e94560]' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                      }`}>
                      Any Stylist
                    </button>
                    {stylists.map(s => (
                      <button key={s.id} onClick={() => setStylistId(s.id)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                          stylistId === s.id ? 'border-[#e94560] bg-[#e94560]/5 text-[#e94560]' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                        }`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Select Date</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {generateDates().map(d => {
                      const dt = new Date(d + 'T00:00:00')
                      return (
                        <button key={d} onClick={() => setDate(d)}
                          className={`shrink-0 px-3 py-2 rounded-xl border-2 text-center transition-colors min-w-14 ${
                            date === d ? 'border-[#e94560] bg-[#e94560]/5 text-[#e94560]' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                          }`}>
                          <p className="text-xs font-medium">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                          <p className="text-sm font-bold">{dt.getDate()}</p>
                          <p className="text-xs">{dt.toLocaleDateString('en-IN', { month: 'short' })}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {date && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Select Time</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {generateTimeSlots().map(t => (
                        <button key={t} onClick={() => setTime(t)}
                          className={`py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                            time === t ? 'border-[#e94560] bg-[#e94560] text-white' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(0)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">← Back</button>
                  <button onClick={() => setStep(2)} disabled={!date || !time}
                    className="flex-1 bg-[#e94560] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contact */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Your Contact Details</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', required: true, placeholder: 'Your name' },
                    { label: 'WhatsApp Number', key: 'phone', type: 'tel', required: true, placeholder: '9876543210' },
                    { label: 'Email (optional)', key: 'email', type: 'email', placeholder: 'your@email.com' },
                    { label: 'Notes (optional)', key: 'notes', type: 'text', placeholder: 'Any preferences or requests' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                      <input type={f.type} required={f.required} placeholder={f.placeholder}
                        value={contact[f.key]}
                        onChange={e => setContact(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560]" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">← Back</button>
                  <button onClick={() => setStep(3)} disabled={!contact.name || !contact.phone}
                    className="flex-1 bg-[#e94560] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                    Review Booking →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800">Review & Confirm</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Services</p>
                    <div className="mt-1 space-y-1">
                      {selectedServices.map(s => (
                        <div key={s.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{s.name}</span>
                          <span className="text-gray-600">₹{Number(s.price).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2 mt-2">
                        <span>Total (~{totalDuration} min)</span>
                        <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="font-medium text-gray-800">{date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="font-medium text-gray-800">{time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium text-gray-800">{contact.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-800">{contact.phone}</p>
                    </div>
                    {stylistId && (
                      <div>
                        <p className="text-xs text-gray-500">Stylist</p>
                        <p className="font-medium text-gray-800">{stylists.find(s => s.id == stylistId)?.name || 'Any'}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                  We'll confirm your appointment via WhatsApp within 30 minutes.
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">← Back</button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 bg-[#e94560] text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60">
                    {submitting ? 'Submitting...' : 'Request Appointment'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
