/** @file Customers API helpers. */
import axios from 'axios'
const BASE = '/api/customers'
export const getCustomers = (search = '') => axios.get(`${BASE}/`, { params: search ? { search } : {} })
export const getCustomer = (id) => axios.get(`${BASE}/${id}/`)
export const createCustomer = (data) => axios.post(`${BASE}/`, data)
export const updateCustomer = (id, data) => axios.patch(`${BASE}/${id}/`, data)
export const getCustomerAppointments = (id) => axios.get(`${BASE}/${id}/appointments/`)
