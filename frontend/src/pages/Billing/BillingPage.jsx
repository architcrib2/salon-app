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
import { FilterBar, useFilters, durationToDates } from '../../components/filters'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function BillingPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  const { filters, setFilters, clearFilters, toAPIParams, apiParamsString, hasActiveFilters } = useFilters({
    defaults: { duration: 'this_month', ...durationToDates('this_month') },
    storageKey: 'salon_filters_billing',
  })

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = toAPIParams()
      const res = await getInvoices(Object.fromEntries(params))
      setInvoices(res.data.data || [])
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvoices() }, [apiParamsString])

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

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        available={['duration', 'staff', 'customer', 'payment_method']}
        hasActive={hasActiveFilters}
      />

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
