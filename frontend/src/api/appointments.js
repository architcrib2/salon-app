/**
 * @file Appointments API helpers.
 * All functions return axios promise — callers handle errors.
 */
import axios from 'axios'

const BASE = '/api/appointments'

export const getAppointments = (params = {}) => axios.get(`${BASE}/`, { params })
export const getAppointmentCalendar = (date, params) => axios.get(`${BASE}/calendar/?date=${date}${params ? '&' + params.toString() : ''}`)
export const getAvailability = (stylist_id, date) => axios.get(`${BASE}/availability/`, { params: { stylist_id, date } })
export const createAppointment = (data) => axios.post(`${BASE}/`, data)
export const updateAppointment = (id, data) => axios.patch(`${BASE}/${id}/`, data)
export const getAppointment = (id) => axios.get(`${BASE}/${id}/`)
