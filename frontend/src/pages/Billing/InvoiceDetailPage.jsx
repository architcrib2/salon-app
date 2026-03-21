/**
 * @file Invoice detail / print view.
 * Shows full invoice breakdown with GST, line items, and totals.
 * Print button triggers browser print dialog.
 */
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvoice } from '../../api/billing'
import Badge from '../../components/Badge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInvoice(id)
      .then(res => setInvoice(res.data.data))
      .catch(() => toast.error('Failed to load invoice'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (!invoice) return <div className="text-center py-12 text-gray-500">Invoice not found</div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/billing')} className="text-sm text-accent hover:text-accent-dark flex items-center gap-1">
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          🖨️ Print
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">✂️</span>
              <span className="text-xl font-bold text-gray-800">KaratOS Salon</span>
            </div>
            <p className="text-sm text-gray-500">Tax Invoice</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-gray-800">{invoice.invoice_number}</p>
            <p className="text-xs text-gray-400 mt-0.5">{format(new Date(invoice.created_at), 'd MMM yyyy, h:mm a')}</p>
            <Badge label={invoice.payment_status} variant={invoice.payment_status} />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Customer info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-1">BILLED TO</p>
            <p className="font-medium text-gray-800">{invoice.customer_name}</p>
            {invoice.customer_phone && <p className="text-gray-500">{invoice.customer_phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-1">PAYMENT</p>
            <Badge label={invoice.payment_method} variant={invoice.payment_method} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-medium text-gray-500">Service</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500">Stylist</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">Price</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">GST</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-2.5 text-gray-800">{item.service_name}</td>
                  <td className="py-2.5 text-gray-500 text-xs">{item.stylist_name}</td>
                  <td className="py-2.5 text-right text-gray-800">₹{Number(item.price).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 text-right text-gray-500 text-xs">
                    {item.gst_rate}% (₹{Number(item.gst_amount).toFixed(2)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>₹{Number(invoice.subtotal).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>GST (18%)</span>
            <span>₹{Number(invoice.gst_amount).toFixed(2)}</span>
          </div>
          {Number(invoice.discount_amount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−₹{Number(invoice.discount_amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {Number(invoice.loyalty_points_used) > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Loyalty Points ({invoice.loyalty_points_used} pts)</span>
              <span>−₹{invoice.loyalty_points_used}</span>
            </div>
          )}
          {Number(invoice.tip_amount) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tip</span>
              <span>₹{Number(invoice.tip_amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <hr className="border-gray-200" />
          <div className="flex justify-between font-bold text-gray-800 text-base">
            <span>Total</span>
            <span>₹{Number(invoice.total_amount).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <p className="text-xs text-center text-gray-400">Thank you for visiting KaratOS Salon! ✂️</p>
      </div>
    </div>
  )
}
