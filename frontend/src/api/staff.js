/** @file Staff API helpers. */
import axios from 'axios'
export const getStaff = () => axios.get('/api/staff/')
export const createStaff = (data) => axios.post('/api/staff/', data)
export const updateStaff = (id, data) => axios.patch(`/api/staff/${id}/`, data)
