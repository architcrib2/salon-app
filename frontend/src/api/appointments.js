/**
 * @file Appointments API helpers.
 * All functions return axios promise — callers handle errors.
 */
import axios from 'axios'

const BASE = '/api/appointments'

export const getAppointments = (params = {}) => axios.get(`${BASE}/`, { params })
export const getAppointmentCalendar = (date) => axios.get(`${BASE}/calendar/`, { params: { date } })
export const getAvailability = (stylist_id, date) => axios.get(`${BASE}/availability/`, { params: { stylist_id, date } })
export const createAppointment = (data) => axios.post(`${BASE}/`, data)
export const updateAppointment = (id, data) => axios.patch(`${BASE}/${id}/`, data)
export const getAppointment = (id) => axios.get(`${BASE}/${id}/`)
