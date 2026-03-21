/** @file Notifications API helpers. */
import axios from 'axios'
export const getNotifications = (params = {}) => axios.get('/api/notifications/', { params })
export const resendNotification = (id) => axios.post(`/api/notifications/resend/${id}/`)
export const getNotificationStats = () => axios.get('/api/notifications/stats/')
