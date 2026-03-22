/** @file Public booking + booking request API helpers. */
import axios from 'axios'
const qs = (p) => { const s = p instanceof URLSearchParams ? p.toString() : new URLSearchParams(p || {}).toString(); return s ? `?${s}` : '' }
export const getPublicServices = () => axios.get('/api/public/services/')
export const getPublicStylists = () => axios.get('/api/public/stylists/')
export const submitBookingRequest = (data) => axios.post('/api/public/book/', data)
export const getBookingRequests = (params) => axios.get(`/api/public/booking-requests/${qs(params)}`)
export const confirmBookingRequest = (id) => axios.post(`/api/public/booking-requests/${id}/confirm/`)
export const rejectBookingRequest = (id, reason) => axios.post(`/api/public/booking-requests/${id}/reject/`, { reason })
