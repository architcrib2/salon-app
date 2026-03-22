/** @file Customers API helpers. */
import axios from 'axios'
const qs = (p) => { const s = p instanceof URLSearchParams ? p.toString() : new URLSearchParams(p || {}).toString(); return s ? `?${s}` : '' }
export const getCustomers = (params) => axios.get(`/api/customers/${qs(params)}`)
export const getCustomer = (id) => axios.get(`/api/customers/${id}/`)
export const createCustomer = (data) => axios.post('/api/customers/', data)
export const updateCustomer = (id, data) => axios.patch(`/api/customers/${id}/`, data)
export const getCustomerAppointments = (id) => axios.get(`/api/customers/${id}/appointments/`)
