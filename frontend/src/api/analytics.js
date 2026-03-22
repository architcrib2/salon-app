/** @file Analytics API helpers. */
import axios from 'axios'

const qs = (params) => {
  if (!params) return ''
  const s = params instanceof URLSearchParams ? params.toString() : new URLSearchParams(params).toString()
  return s ? `?${s}` : ''
}

export const getRevenue = (period = 'month', params) => axios.get(`/api/analytics/revenue/${qs({ period, ...Object.fromEntries(params || new URLSearchParams()) })}`)
export const getTopServices = (params) => axios.get(`/api/analytics/top-services/${qs(params)}`)
export const getStaffPerformance = (params) => axios.get(`/api/analytics/staff-performance/${qs(params)}`)
export const getCustomerRetention = (params) => axios.get(`/api/analytics/customer-retention/${qs(params)}`)
export const getHeatmap = (params) => axios.get(`/api/analytics/heatmap/${qs(params)}`)
export const getRevenueBreakdown = (params) => axios.get(`/api/analytics/revenue-breakdown/${qs(params)}`)
export const getMembershipStats = (params) => axios.get(`/api/analytics/membership-stats/${qs(params)}`)
export const getReferralStats = (params) => axios.get(`/api/analytics/referral-stats/${qs(params)}`)
export const getChurnRisk = (params) => axios.get(`/api/analytics/churn-risk/${qs(params)}`)
export const getNextVisitPredictions = (params) => axios.get(`/api/analytics/next-visit-predictions/${qs(params)}`)
export const getVIPRanking = (params) => axios.get(`/api/analytics/vip-ranking/${qs(params)}`)
export const getRebookingOpportunities = (params) => axios.get(`/api/analytics/rebooking-opportunities/${qs(params)}`)
export const sendRebookingNudge = (customerId) => axios.post('/api/analytics/send-rebooking-nudge/', { customer_id: customerId })
export const getStaffIntelligence = (params) => axios.get(`/api/analytics/staff-intelligence/${qs(params)}`)
export const getInventoryIntelligence = (params) => axios.get(`/api/analytics/inventory-intelligence/${qs(params)}`)
