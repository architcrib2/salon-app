/** @file Memberships API helpers. */
import axios from 'axios'
export const getMembershipPlans = () => axios.get('/api/memberships/plans/')
export const createMembershipPlan = (data) => axios.post('/api/memberships/plans/', data)
export const updateMembershipPlan = (id, data) => axios.patch(`/api/memberships/plans/${id}/`, data)
export const getCustomerMemberships = (customerId) => axios.get(`/api/memberships/customer/${customerId}/`)
export const purchaseMembership = (data) => axios.post('/api/memberships/purchase/', data)
export const redeemMembership = (data) => axios.post('/api/memberships/redeem/', data)
export const getExpiringSoon = () => axios.get('/api/memberships/expiring-soon/')
