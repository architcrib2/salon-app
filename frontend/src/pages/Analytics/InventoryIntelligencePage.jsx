/**
 * @file Inventory Intelligence page.
 * 4 tabs: Stockout Risk, Dead Stock, Turnover, Smart Reorder.
 * Calls GET /api/analytics/inventory-intelligence/
 */
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const TABS = ['Stockout Risk', 'Dead Stock', 'Turnover', 'Smart Reorder']

const fmt   = (n) => Number(n || 0).toLocaleString('en-IN')
const fmtD  = (n) => Number(n || 0).toFixed(2)

/* badge helper maps */
const RISK_BAND_CLS = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-green-100 text-green-700',
}

const DEAD_STATUS_CLS = {
  dead_stock:   'bg-red-100 text-red-700',
  stagnant:     'bg-orange-100 text-orange-700',
  slow_moving:  'bg-yellow-100 text-yellow-700',
  never_used:   'bg-purple-100 text-purple-700',
  active:       'bg-green-100 text-green-700',
}

const SPEED_CLS = {
  fast_mover:   'bg-green-100 text-green-700',
  medium_mover: 'bg-blue-100 text-blue-700',
  slow_mover:   'bg-yellow-100 text-yellow-700',
  no_movement:  'bg-gray-100 text-gray-500',
}

const PRIORITY_CLS = {
  urgent: 'bg-red-100 text-red-700',
  soon:   'bg-orange-100 text-orange-700',
  plan:   'bg-blue-100 text-blue-700',
}

function ScoreBar({ value, max = 100, color = 'bg-accent' }) {
  const w = Math.min(100, Math.round(((value || 0) / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2" style={{ minWidth: 60 }}>
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{value}</span>
    </div>
  )
}

/* ─── TAB 1: STOCKOUT RISK ─────────────────────────────────────────────────── */

function StockoutRiskTab({ data, summary }) {
  if (!data.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-500 text-sm">No stockout risk data available. All stock levels look healthy.</p>
    </div>
  )

  const sorted = [...data].sort((a, b) => Number(b.stockout_risk_score || 0) - Number(a.stockout_risk_score || 0))

  const daysCls = (days) => {
    if (days == null) return 'text-gray-400'
    if (days <= 3)    return 'text-red-600 font-bold'
    if (days <= 7)    return 'text-orange-500 font-medium'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-red-50 rounded-xl p-3 text-center text-red-700">
            <p className="text-2xl font-bold">{summary.critical_stockout}</p>
            <p className="text-xs font-medium mt-0.5">Critical</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center text-orange-700">
            <p className="text-2xl font-bold">{summary.high_stockout}</p>
            <p className="text-xs font-medium mt-0.5">High Risk</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center text-gray-700 col-span-2 md:col-span-1">
            <p className="text-2xl font-bold">{summary.total_products}</p>
            <p className="text-xs font-medium mt-0.5">Total Products</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[110px]">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days Left</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Daily Use</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.risk_band === 'critical' ? 'bg-red-50' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.brand} · {r.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${RISK_BAND_CLS[r.risk_band] || 'bg-gray-100 text-gray-600'}`}>
                      {r.risk_band}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-36">
                    <ScoreBar
                      value={r.stockout_risk_score ?? 0}
                      color={
                        r.risk_band === 'critical' ? 'bg-red-500' :
                        r.risk_band === 'high'     ? 'bg-orange-400' :
                        r.risk_band === 'medium'   ? 'bg-yellow-400' : 'bg-green-400'
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.current_stock} {r.unit}
                    {r.is_below_reorder && (
                      <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">Below reorder</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${daysCls(r.days_until_stockout)}`}>
                    {r.days_until_stockout == null ? (
                      <span className="text-gray-400 text-xs">No usage data</span>
                    ) : (
                      `${r.days_until_stockout}d`
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {r.avg_daily_consumption != null
                      ? `${Number(r.avg_daily_consumption).toFixed(2)} ${r.unit}/day`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.supplier || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── TAB 2: DEAD STOCK ────────────────────────────────────────────────────── */

function DeadStockTab({ deadData, summary }) {
  const items = deadData?.dead_and_slow || []

  if (!items.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-800 font-medium mb-1">No dead stock found.</p>
      <p className="text-gray-500 text-sm">All inventory items are actively being used.</p>
    </div>
  )

  const sorted = [...items].sort((a, b) => Number(b.capital_tied || 0) - Number(a.capital_tied || 0))
  const totalDeadCapital = deadData?.total_dead_capital || 0

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-red-600 font-medium">Total idle capital</p>
          <p className="text-3xl font-bold text-red-700 mt-0.5">₹{fmt(totalDeadCapital)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-red-600">{sorted.length}</p>
          <p className="text-xs text-red-500 mt-0.5">dormant items</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Capital Tied</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days Dormant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Used</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.brand} · {r.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DEAD_STATUS_CLS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">₹{fmt(r.capital_tied)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.days_since_last_usage != null ? `${r.days_since_last_usage}d` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(r.last_usage_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.current_stock} {r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── TAB 3: TURNOVER ──────────────────────────────────────────────────────── */

function TurnoverTab({ turnoverData }) {
  const products   = turnoverData?.products || []
  const categories = turnoverData?.by_category || []
  const overall    = turnoverData?.summary

  if (!products.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-500 text-sm">No turnover data available yet.</p>
    </div>
  )

  const wastageRate = Number(overall?.overall_wastage_rate_pct || 0)
  const wastageColor = wastageRate >= 20 ? 'bg-red-50 border-red-200 text-red-700' : wastageRate >= 10 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'

  const maxTurnover = Math.max(...products.map(p => Number(p.turnover_rate || 0)), 1)

  return (
    <div className="space-y-4">
      {/* Wastage banner */}
      {overall && (
        <div className={`border rounded-xl px-5 py-3 flex items-center justify-between ${wastageColor}`}>
          <div>
            <p className="text-sm font-medium">Overall wastage rate</p>
            <p className="text-xs mt-0.5 opacity-75">
              ₹{fmt(overall.total_wastage_value)} wasted of ₹{fmt(overall.total_consumption_value)} consumed
            </p>
          </div>
          <p className="text-3xl font-bold">{wastageRate.toFixed(1)}%</p>
        </div>
      )}

      {/* Category cards */}
      {categories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.slice(0, 6).map((cat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="text-xs text-gray-400 font-medium uppercase truncate">{cat.category || cat.name}</p>
              <p className="text-lg font-bold text-gray-800 mt-1">₹{fmt(cat.cost_consumed_30d ?? cat.consumption_value)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cat.usage_30d ?? cat.total_usage} used (30d)</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Speed</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Used (30d)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Wastage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase min-w-[120px]">Turnover Rate</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cost (30d)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(r => {
                const tr = Number(r.turnover_rate || 0)
                const barW = Math.round((tr / maxTurnover) * 100)
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.brand} · {r.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SPEED_CLS[r.speed] || 'bg-gray-100 text-gray-500'}`}>
                        {r.speed?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.usage_30d} {r.unit}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.wastage_30d > 0 ? (
                        <span className="text-orange-600">{r.wastage_30d} ({fmtD(r.wastage_rate_pct)}%)</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2" style={{ minWidth: 60 }}>
                          <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${barW}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 w-8 text-right">{tr.toFixed(1)}x</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800">₹{fmt(r.cost_consumed_30d)}</td>
                    <td className="px-4 py-3 text-gray-600">{r.current_stock} {r.unit}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── TAB 4: SMART REORDER ─────────────────────────────────────────────────── */

function SmartReorderTab({ reorderData }) {
  const suggestions = reorderData?.suggestions || []
  const byPriority  = reorderData?.by_priority || {}
  const totalCost   = Number(reorderData?.total_reorder_cost || 0)
  const totalItems  = reorderData?.total_items_to_reorder || 0

  if (!suggestions.length) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-800 font-medium mb-1">No reorder suggestions right now.</p>
      <p className="text-gray-500 text-sm">Stock levels are sufficient across all products.</p>
    </div>
  )

  const sorted = [...suggestions].sort((a, b) => {
    const ORDER = { urgent: 0, soon: 1, plan: 2 }
    const pa = ORDER[a.priority] ?? 3
    const pb = ORDER[b.priority] ?? 3
    if (pa !== pb) return pa - pb
    return Number(a.days_until_stockout ?? 999) - Number(b.days_until_stockout ?? 999)
  })

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }

  const handlePrint = () => {
    const rows = sorted.map((r, i) =>
      `<tr>
        <td>${i + 1}</td>
        <td><strong>${r.name}</strong><br/><small>${r.brand || ''} · ${r.category || ''}</small></td>
        <td>${r.priority?.toUpperCase()}</td>
        <td>${r.suggested_order_qty} ${r.unit}</td>
        <td>₹${Number(r.estimated_cost || 0).toLocaleString('en-IN')}</td>
        <td>${r.supplier || '—'}</td>
        <td>${fmtDate(r.reorder_by)}</td>
      </tr>`
    ).join('')

    const html = `
      <html>
        <head>
          <title>Purchase Order — Reorder List</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #1f2937; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p  { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #f9fafb; text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; }
            td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
            tfoot td { font-weight: bold; border-top: 2px solid #e5e7eb; }
            small { color: #9ca3af; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Purchase Order — Reorder List</h1>
          <p>Generated: ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; ${totalItems} items &nbsp;|&nbsp; Estimated total: ₹${totalCost.toLocaleString('en-IN')}</p>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Product</th><th>Priority</th><th>Qty</th><th>Est. Cost</th><th>Supplier</th><th>Reorder By</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="4">Total</td>
                <td>₹${totalCost.toLocaleString('en-IN')}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      win.print()
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Items to Reorder</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center text-red-700">
          <p className="text-2xl font-bold">{byPriority.urgent_count ?? 0}</p>
          <p className="text-xs font-medium mt-0.5">Urgent</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center text-orange-700">
          <p className="text-2xl font-bold">{byPriority.soon_count ?? 0}</p>
          <p className="text-xs font-medium mt-0.5">Soon</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center text-blue-700">
          <p className="text-2xl font-bold">{byPriority.plan_count ?? 0}</p>
          <p className="text-xs font-medium mt-0.5">Plan</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">Sorted by urgency. Estimated total cost: <span className="font-semibold text-gray-800">₹{fmt(totalCost)}</span></p>
          <button
            onClick={handlePrint}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium whitespace-nowrap"
          >
            Print Purchase Order
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Days Left</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Suggest Qty</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reorder By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(r => {
                const days = r.days_until_stockout
                const daysCls =
                  days == null         ? 'text-gray-400' :
                  days <= 3            ? 'text-red-600 font-bold' :
                  days <= 7            ? 'text-orange-500 font-medium' : 'text-gray-600'

                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${r.priority === 'urgent' ? 'bg-red-50/40' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.brand} · {r.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_CLS[r.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.current_stock} {r.unit}</td>
                    <td className={`px-4 py-3 ${daysCls}`}>
                      {days == null ? <span className="text-gray-400 text-xs">—</span> : `${days}d`}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{r.suggested_order_qty} {r.unit}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(r.reorder_by)}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">₹{fmt(r.estimated_cost)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.supplier || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            {/* Sticky total row */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={6} className="px-5 py-3 text-sm font-semibold text-gray-700">Total ({totalItems} items)</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{fmt(totalCost)}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN PAGE ────────────────────────────────────────────────────────────── */

export default function InventoryIntelligencePage() {
  const [activeTab, setActiveTab] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/analytics/inventory-intelligence/')
        setData(res.data.data || {})
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load inventory intelligence')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const tabCounts = data
    ? [
        data.stockout_risk?.length ?? 0,
        (data.dead_stock?.dead_and_slow?.length ?? 0),
        data.turnover?.products?.length ?? 0,
        data.reorder?.suggestions?.length ?? 0,
      ]
    : [0, 0, 0, 0]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Inventory Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">Stockout risk, dead stock, turnover analysis and smart reorder suggestions</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === i
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {!loading && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {tabCounts[i]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Analysing inventory data..." />
      ) : !data ? null : (
        <>
          {activeTab === 0 && <StockoutRiskTab data={data.stockout_risk || []} summary={data.summary} />}
          {activeTab === 1 && <DeadStockTab deadData={data.dead_stock} summary={data.summary} />}
          {activeTab === 2 && <TurnoverTab turnoverData={data.turnover} />}
          {activeTab === 3 && <SmartReorderTab reorderData={data.reorder} />}
        </>
      )}
    </div>
  )
}
