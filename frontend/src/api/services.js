/** @file Services API helpers. */
import axios from 'axios'
export const getServices = (params = {}) => axios.get('/api/services/', { params })
export const getCategories = () => axios.get('/api/services/categories/')
export const createService = (data) => axios.post('/api/services/', data)
export const updateService = (id, data) => axios.patch(`/api/services/${id}/`, data)
