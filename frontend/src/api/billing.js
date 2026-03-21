/** @file Billing API helpers. */
import axios from 'axios'
export const getInvoices = (params = {}) => axios.get('/api/billing/invoices/', { params })
export const getInvoice = (id) => axios.get(`/api/billing/invoices/${id}/`)
export const createInvoice = (data) => axios.post('/api/billing/invoices/', data)
export const getDailySummary = (date) => axios.get('/api/billing/daily-summary/', { params: { date } })
export const getWalkinSummary = (date) => axios.get('/api/billing/walkin-summary/', { params: { date } })
