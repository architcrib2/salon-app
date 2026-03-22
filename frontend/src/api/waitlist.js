/** @file Waitlist API helpers. */
import axios from 'axios'
const qs = (p) => { const s = p instanceof URLSearchParams ? p.toString() : new URLSearchParams(p || {}).toString(); return s ? `?${s}` : '' }
export const getWaitlistToday = (params) => axios.get(`/api/waitlist/today/${qs(params)}`)
export const addToWaitlist = (data) => axios.post('/api/waitlist/', data)
export const updateWaitlistStatus = (id, data) => axios.patch(`/api/waitlist/${id}/status/`, data)
export const removeFromWaitlist = (id) => axios.delete(`/api/waitlist/${id}/`)
export const getWaitlistStats = () => axios.get('/api/waitlist/stats/')
