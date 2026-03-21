/**
 * @file Billing list page.
 * List of invoices with date range + payment method filters. Click to view detail.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInvoices } from '../../api/billing'
import Badge from '../../components/Badge'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function BillingPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ date_from: '', date_to: '', payment_method: '' })

  const fetchInvoices = async (f = filters) => {
    setLoading(true)
    try {
      const params = {}
      if (f.date_from) params.date_from = f.date_from
      if (f.date_to) params.date_to = f.date_to
      if (f.payment_method) params.payment_method = f.payment_method
      const res = await getInvoices(params)
      setInvoices(res.data.data || [])
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvoices() }, [])

  const handleFilter = (key, val) => {
    const newFilters = { ...filters, [key]: val }
    setFilters(newFilters)
    fetchInvoices(newFilters)
  }

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0)

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-sm text-gray-500">Total shown: <span className="font-bold text-gray-800 text-lg">₹{totalRevenue.toLocaleString('en-IN')}</span></h2>
        </div>
        <button
          onClick={() => navigate('/billing/new')}
          className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          ➕ Create Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={filters.date_from}
            onChange={e => handleFilter('date_from', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={filters.date_to}
            onChange={e => handleFilter('date_to', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Payment Method</label>
          <select value={filters.payment_method}
            onChange={e => handleFilter('payment_method', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFilters({ date_from: '', date_to: '', payment_method: '' }); fetchInvoices({ date_from: '', date_to: '', payment_method: '' }) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            Clear
          </button>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500">{invoices.length} invoices</span>
        </div>

        {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
          <EmptyState icon="🧾" title="No invoices found" description="Adjust filters or create a new invoice"
            action={{ label: 'Create Invoice', onClick: () => navigate('/billing/new') }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id} onClick={() => navigate(`/billing/${inv.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{inv.customer_name}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><Badge label={inv.payment_method} variant={inv.payment_method} /></td>
                    <td className="px-4 py-3"><Badge label={inv.payment_status} variant={inv.payment_status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {format(new Date(inv.created_at), 'd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
