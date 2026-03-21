/** @file Waitlist API helpers. */
import axios from 'axios'
export const getWaitlistToday = () => axios.get('/api/waitlist/today/')
export const addToWaitlist = (data) => axios.post('/api/waitlist/', data)
export const updateWaitlistStatus = (id, data) => axios.patch(`/api/waitlist/${id}/status/`, data)
export const removeFromWaitlist = (id) => axios.delete(`/api/waitlist/${id}/`)
export const getWaitlistStats = () => axios.get('/api/waitlist/stats/')
