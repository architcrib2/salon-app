/** @file Inventory API helpers. */
import axios from 'axios'
export const getProducts = (params = {}) => axios.get('/api/inventory/', { params })
export const createProduct = (data) => axios.post('/api/inventory/', data)
export const updateProduct = (id, data) => axios.patch(`/api/inventory/${id}/`, data)
// Phase 3 — Inventory transactions
export const getTransactionHistory = (productId) => axios.get(`/api/inventory/${productId}/transactions/`)
export const restockProduct = (productId, data) => axios.post(`/api/inventory/${productId}/restock/`, data)
export const adjustProduct = (productId, data) => axios.post(`/api/inventory/${productId}/adjust/`, data)
export const getLowStockAlerts = () => axios.get('/api/inventory/low-stock-alerts/')
export const getConsumptionReport = () => axios.get('/api/inventory/consumption-report/')
// Service-product mappings
export const getServiceMappings = () => axios.get('/api/inventory/service-product-usages/')
export const createServiceMapping = (data) => axios.post('/api/inventory/service-product-usages/', data)
export const deleteServiceMapping = (id) => axios.delete(`/api/inventory/service-product-usages/${id}/`)
