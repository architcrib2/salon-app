/**
 * @file Enhanced Inventory page.
 * 4 tabs: Products, Transactions, Service Mappings, Consumption Report.
 * Add product modal, inline restock/adjust, transaction history, service-product mappings.
 */
import React, { useEffect, useState } from 'react'
import {
  getProducts, createProduct, updateProduct,
  getTransactionHistory, restockProduct, adjustProduct,
  getLowStockAlerts, getServiceMappings, createServiceMapping, deleteServiceMapping,
  getConsumptionReport,
} from '../../api/inventory'
import { getServices } from '../../api/services'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TABS = ['Products', 'Transactions', 'Service Mappings', 'Consumption']

const TXN_TYPE_LABEL = {
  restock: { label: 'Restock', cls: 'bg-green-100 text-green-700' },
  manual_adjustment: { label: 'Adjustment', cls: 'bg-yellow-100 text-yellow-700' },
  service_deduction: { label: 'Used', cls: 'bg-blue-100 text-blue-700' },
  correction: { label: 'Correction', cls: 'bg-gray-100 text-gray-600' },
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState(0)

  // Products tab state
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restockId, setRestockId] = useState(null)
  const [restockQty, setRestockQty] = useState('')
  const [adjustId, setAdjustId] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ qty: '', reason: '' })
  const [form, setForm] = useState({
    name: '', brand: '', category: '', quantity_in_stock: '', unit: 'pieces',
    reorder_level: '', cost_price: '', supplier_name: ''
  })

  // Transactions tab state
  const [txnProductId, setTxnProductId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loadingTxns, setLoadingTxns] = useState(false)

  // Service mappings state
  const [mappings, setMappings] = useState([])
  const [loadingMappings, setLoadingMappings] = useState(false)
  const [services, setServices] = useState([])
  const [mappingForm, setMappingForm] = useState({ service_id: '', product_id: '', quantity_used: '' })

  // Consumption state
  const [consumption, setConsumption] = useState([])
  const [loadingConsumption, setLoadingConsumption] = useState(false)

  const fetchProducts = async (lowStock = lowStockOnly) => {
    setLoadingProducts(true)
    try {
      const params = lowStock ? { low_stock: true } : {}
      const res = await getProducts(params)
      setProducts(res.data.data || [])
    } catch {
      toast.error('Failed to load inventory')
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  // Load tab-specific data when switching
  useEffect(() => {
    if (activeTab === 1 && txnProductId) loadTransactions(txnProductId)
    if (activeTab === 2 && mappings.length === 0) loadMappings()
    if (activeTab === 3 && consumption.length === 0) loadConsumption()
  }, [activeTab])

  const loadTransactions = async (pid) => {
    if (!pid) return
    setLoadingTxns(true)
    try {
      const res = await getTransactionHistory(pid)
      setTransactions(res.data.data || [])
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoadingTxns(false)
    }
  }

  const loadMappings = async () => {
    setLoadingMappings(true)
    try {
      const [mRes, sRes] = await Promise.all([getServiceMappings(), getServices()])
      setMappings(mRes.data.data || [])
      setServices(sRes.data.data || [])
    } catch {
      toast.error('Failed to load mappings')
    } finally {
      setLoadingMappings(false)
    }
  }

  const loadConsumption = async () => {
    setLoadingConsumption(true)
    try {
      const res = await getConsumptionReport()
      setConsumption(res.data.data || [])
    } catch {
      toast.error('Failed to load consumption report')
    } finally {
      setLoadingConsumption(false)
    }
  }

  const handleLowStockToggle = () => {
    const next = !lowStockOnly
    setLowStockOnly(next)
    fetchProducts(next)
  }

  const handleRestock = async (productId) => {
    if (!restockQty || isNaN(restockQty) || Number(restockQty) <= 0) {
      toast.error('Enter a valid quantity')
      return
    }
    try {
      await restockProduct(productId, { quantity: Number(restockQty) })
      toast.success('Restocked!')
      setRestockId(null)
      setRestockQty('')
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restock')
    }
  }

  const handleAdjust = async (productId) => {
    if (!adjustForm.qty || isNaN(adjustForm.qty)) {
      toast.error('Enter a valid quantity')
      return
    }
    try {
      await adjustProduct(productId, { quantity_change: Number(adjustForm.qty), notes: adjustForm.reason })
      toast.success('Adjusted!')
      setAdjustId(null)
      setAdjustForm({ qty: '', reason: '' })
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust')
    }
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!form.name || !form.quantity_in_stock || !form.cost_price) {
      toast.error('Name, quantity and cost price are required')
      return
    }
    setSaving(true)
    try {
      await createProduct(form)
      toast.success('Product added!')
      setShowAddModal(false)
      setForm({ name: '', brand: '', category: '', quantity_in_stock: '', unit: 'pieces', reorder_level: '', cost_price: '', supplier_name: '' })
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMapping = async (e) => {
    e.preventDefault()
    if (!mappingForm.service_id || !mappingForm.product_id || !mappingForm.quantity_used) {
      toast.error('All fields required')
      return
    }
    try {
      await createServiceMapping(mappingForm)
      toast.success('Mapping added!')
      setMappingForm({ service_id: '', product_id: '', quantity_used: '' })
      loadMappings()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add mapping')
    }
  }

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('Remove this mapping?')) return
    try {
      await deleteServiceMapping(id)
      toast.success('Mapping removed')
      loadMappings()
    } catch {
      toast.error('Failed to remove mapping')
    }
  }

  const lowCount = products.filter(p => p.is_low_stock).length

  return (
    <div className="space-y-4">
      {/* Low stock alert */}
      {lowCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm font-medium text-red-700">
            {lowCount} product{lowCount > 1 ? 's' : ''} below reorder level
          </p>
        </div>
      )}

      {/* Tabs */}
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
          </button>
        ))}
      </div>

      {/* ── Tab 0: Products ── */}
      {activeTab === 0 && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={lowStockOnly} onChange={handleLowStockToggle}
                  className="accent-accent w-4 h-4" />
                <span className="text-sm text-gray-700 font-medium">Low stock only</span>
              </label>
              <span className="text-sm text-gray-400">{products.length} products</span>
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-dark transition-colors">
              ➕ Add Product
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingProducts ? <LoadingSpinner /> : products.length === 0 ? (
              <EmptyState icon="📦" title="No products found"
                description="Start by adding your first inventory item"
                action={{ label: 'Add Product', onClick: () => setShowAddModal(true) }} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reorder At</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Restocked</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map(p => (
                      <tr key={p.id} className={p.is_low_stock ? 'bg-red-50/60' : 'hover:bg-gray-50'}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {p.is_low_stock && <span className="text-red-500" title="Low stock">⚠️</span>}
                            <div>
                              <p className="font-medium text-gray-800">{p.name}</p>
                              {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.category}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${p.is_low_stock ? 'text-red-600' : 'text-gray-800'}`}>
                            {p.quantity_in_stock} {p.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.reorder_level} {p.unit}</td>
                        <td className="px-4 py-3 text-gray-800">₹{Number(p.cost_price).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {p.last_restocked ? format(new Date(p.last_restocked), 'd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {restockId === p.id ? (
                            <div className="flex items-center gap-1">
                              <input type="number" min="1" value={restockQty}
                                onChange={e => setRestockQty(e.target.value)}
                                placeholder="qty" autoFocus
                                className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
                              <button onClick={() => handleRestock(p.id)}
                                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">✓</button>
                              <button onClick={() => { setRestockId(null); setRestockQty('') }}
                                className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                            </div>
                          ) : adjustId === p.id ? (
                            <div className="flex items-center gap-1">
                              <input type="number" value={adjustForm.qty}
                                onChange={e => setAdjustForm(f => ({ ...f, qty: e.target.value }))}
                                placeholder="±qty" autoFocus
                                className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
                              <input type="text" value={adjustForm.reason}
                                onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                                placeholder="reason"
                                className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
                              <button onClick={() => handleAdjust(p.id)}
                                className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">✓</button>
                              <button onClick={() => { setAdjustId(null); setAdjustForm({ qty: '', reason: '' }) }}
                                className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setRestockId(p.id); setRestockQty(''); setAdjustId(null) }}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                                  p.is_low_stock
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}>
                                Restock
                              </button>
                              <button
                                onClick={() => { setAdjustId(p.id); setAdjustForm({ qty: '', reason: '' }); setRestockId(null) }}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                                Adjust
                              </button>
                              <button
                                onClick={() => {
                                  setTxnProductId(p.id.toString())
                                  setActiveTab(1)
                                  loadTransactions(p.id)
                                }}
                                className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                History
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab 1: Transactions ── */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select
              value={txnProductId}
              onChange={e => { setTxnProductId(e.target.value); loadTransactions(e.target.value) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">— Select product —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.quantity_in_stock} {p.unit})</option>
              ))}
            </select>
            {txnProductId && !loadingTxns && (
              <span className="text-sm text-gray-400">{transactions.length} records</span>
            )}
          </div>

          {!txnProductId ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-4xl mb-2">📋</p>
              <p className="text-gray-500 text-sm">Select a product to view its transaction history</p>
            </div>
          ) : loadingTxns ? <LoadingSpinner /> : transactions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-gray-500 text-sm">No transactions found for this product</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty Change</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance After</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map(t => {
                      const meta = TXN_TYPE_LABEL[t.transaction_type] || { label: t.transaction_type, cls: 'bg-gray-100 text-gray-600' }
                      return (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-gray-600 text-xs">
                            {format(new Date(t.created_at), 'd MMM yyyy, h:mm a')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${t.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{t.quantity_after}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{t.notes || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{t.created_by_name || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Service Mappings ── */}
      {activeTab === 2 && (
        <div className="space-y-4">
          {/* Add mapping form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Add Service → Product Mapping</h3>
            <form onSubmit={handleAddMapping} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
                <select value={mappingForm.service_id}
                  onChange={e => setMappingForm(f => ({ ...f, service_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="">Select service</option>
                  {services.filter(s => s.is_active).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                <select value={mappingForm.product_id}
                  onChange={e => setMappingForm(f => ({ ...f, product_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-600 mb-1">Qty Used</label>
                <input type="number" min="0.01" step="0.01" value={mappingForm.quantity_used}
                  onChange={e => setMappingForm(f => ({ ...f, quantity_used: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <button type="submit"
                className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
                Add
              </button>
            </form>
          </div>

          {/* Mappings list */}
          {loadingMappings ? <LoadingSpinner /> : mappings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-3xl mb-2">🔗</p>
              <p className="text-gray-500 text-sm">No mappings yet. Add one above to enable auto-deduction.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty per Use</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mappings.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{m.service_name}</td>
                      <td className="px-4 py-3 text-gray-600">{m.product_name}</td>
                      <td className="px-4 py-3 text-gray-600">{m.quantity_used} {m.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteMapping(m.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Consumption Report ── */}
      {activeTab === 3 && (
        <div className="space-y-4">
          {loadingConsumption ? <LoadingSpinner /> : consumption.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-gray-500 text-sm">No consumption data yet. Complete invoices with service-product mappings to see usage here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm text-gray-500">Products consumed by service over time (from invoice deductions)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Used</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Deductions</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {consumption.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800">{r.product_name}</p>
                          <p className="text-xs text-gray-400">{r.unit}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {r.total_consumed} {r.unit}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.transaction_count}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          ₹{Number(r.estimated_cost || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Product" size="lg">
        <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              placeholder="Shampoo, Wax, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity in Stock *</label>
            <input type="number" min="0" value={form.quantity_in_stock} onChange={e => setForm({...form, quantity_in_stock: e.target.value})} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="pieces">pieces</option>
              <option value="ml">ml</option>
              <option value="grams">grams</option>
              <option value="litres">litres</option>
              <option value="kg">kg</option>
              <option value="tubes">tubes</option>
              <option value="bottles">bottles</option>
              <option value="cans">cans</option>
              <option value="rolls">rolls</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
            <input type="number" min="0" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹) *</label>
            <input type="number" min="0" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
            <input type="text" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div className="col-span-2 flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-dark disabled:opacity-60">
              {saving ? 'Adding...' : 'Add Product'}
            </button>
            <button type="button" onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
