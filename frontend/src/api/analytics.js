/** @file Analytics API helpers. */
import axios from 'axios'
export const getRevenue = (period = 'month') => axios.get('/api/analytics/revenue/', { params: { period } })
export const getTopServices = () => axios.get('/api/analytics/top-services/')
export const getStaffPerformance = () => axios.get('/api/analytics/staff-performance/')
export const getCustomerRetention = () => axios.get('/api/analytics/customer-retention/')
// Phase 2 enhanced analytics
export const getHeatmap = () => axios.get('/api/analytics/heatmap/')
export const getRevenueBreakdown = () => axios.get('/api/analytics/revenue-breakdown/')
export const getMembershipStats = () => axios.get('/api/analytics/membership-stats/')
export const getReferralStats = () => axios.get('/api/analytics/referral-stats/')
// Phase 3 — Customer Intelligence
export const getChurnRisk = () => axios.get('/api/analytics/churn-risk/')
export const getNextVisitPredictions = () => axios.get('/api/analytics/next-visit-predictions/')
export const getVIPRanking = () => axios.get('/api/analytics/vip-ranking/')
export const getRebookingOpportunities = () => axios.get('/api/analytics/rebooking-opportunities/')
export const sendRebookingNudge = (customerId) => axios.post('/api/analytics/send-rebooking-nudge/', { customer_id: customerId })
// Phase 3 — Staff & Inventory Intelligence
export const getStaffIntelligence = () => axios.get('/api/analytics/staff-intelligence/')
export const getInventoryIntelligence = () => axios.get('/api/analytics/inventory-intelligence/')
