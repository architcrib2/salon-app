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

  const handleDownloadGSTInvoice = () => {
    if (!invoice) return
    const dateStr = format(new Date(invoice.created_at), 'd MMM yyyy, h:mm a')
    const rows = invoice.items?.map(item => `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0">${item.service_name}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">₹${Number(item.price).toLocaleString('en-IN')}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">${Number(item.gst_rate).toFixed(0)}%</td>
        <td style="padding:8px 6px;border-bottom:1px solid #f0f0f0;text-align:right">₹${Number(item.gst_amount).toFixed(2)}</td>
      </tr>`).join('') || ''

    const discountRow = Number(invoice.discount_amount) > 0
      ? `<tr><td style="color:#16a34a;padding:6px">Discount</td><td class="text-right" style="color:#16a34a;padding:6px">−₹${Number(invoice.discount_amount).toLocaleString('en-IN')}</td></tr>`
      : ''
    const loyaltyRow = Number(invoice.loyalty_points_used) > 0
      ? `<tr><td style="color:#d97706;padding:6px">Loyalty Points (${invoice.loyalty_points_used} pts)</td><td class="text-right" style="color:#d97706;padding:6px">−₹${invoice.loyalty_points_used}</td></tr>`
      : ''
    const tipRow = Number(invoice.tip_amount) > 0
      ? `<tr><td style="padding:6px">Tip</td><td class="text-right" style="padding:6px">₹${Number(invoice.tip_amount).toLocaleString('en-IN')}</td></tr>`
      : ''

    const html = `
      <html><head><title>GST Invoice — ${invoice.invoice_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;max-width:600px;margin:auto;color:#222}
        h1{font-size:22px;margin:0}h2{font-size:13px;color:#666;font-weight:normal;margin:4px 0 0}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f5f5f5;padding:8px 6px;text-align:left;border-bottom:2px solid #ddd;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
        .text-right{text-align:right}.divider{border:none;border-top:1px solid #eee;margin:14px 0}
        .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#dcfce7;color:#16a34a}
        .label{color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
        @media print{body{padding:0}}
      </style></head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
          <div><h1>✂️ KaratOS Salon</h1><h2>GST Tax Invoice</h2></div>
          <div style="text-align:right">
            <div style="font-family:monospace;font-weight:bold;font-size:14px">${invoice.invoice_number}</div>
            <div style="font-size:12px;color:#666;margin-top:3px">${dateStr}</div>
            <div class="badge" style="margin-top:6px">${invoice.payment_status}</div>
          </div>
        </div>
        <hr class="divider">
        <div style="display:flex;justify-content:space-between;margin-bottom:20px">
          <div>
            <div class="label">Billed To</div>
            <div style="font-weight:600;font-size:14px">${invoice.customer_name}</div>
            <div style="color:#666;font-size:13px">${invoice.customer_phone || ''}</div>
          </div>
          <div style="text-align:right">
            <div class="label">Payment</div>
            <div style="font-weight:600;font-size:14px;text-transform:capitalize">${invoice.payment_method}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Amount</th>
              <th class="text-right">GST Rate</th>
              <th class="text-right">GST Amt</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <hr class="divider">
        <table style="font-size:13px">
          <tr><td style="color:#666;padding:5px">Subtotal</td><td class="text-right" style="padding:5px">₹${Number(invoice.subtotal).toLocaleString('en-IN')}</td></tr>
          <tr><td style="color:#666;padding:5px">GST</td><td class="text-right" style="padding:5px">₹${Number(invoice.gst_amount).toFixed(2)}</td></tr>
          ${discountRow}${loyaltyRow}${tipRow}
          <tr><td style="font-weight:bold;font-size:15px;padding:8px 5px 5px">Total</td><td class="text-right" style="font-weight:bold;font-size:15px;padding:8px 5px 5px">₹${Number(invoice.total_amount).toLocaleString('en-IN')}</td></tr>
        </table>
        <hr class="divider" style="margin-top:24px">
        <p style="text-align:center;color:#999;font-size:12px">Thank you for visiting KaratOS Salon! ✂️</p>
      </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  if (loading) return <LoadingSpinner />
  if (!invoice) return <div className="text-center py-12 text-gray-500">Invoice not found</div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/billing')} className="text-sm text-accent hover:text-accent-dark flex items-center gap-1">
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadGSTInvoice}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark"
          >
            📄 GST Invoice
          </button>
          <button
            onClick={() => window.print()}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            🖨️ Print
          </button>
        </div>
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
            <span>GST</span>
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
