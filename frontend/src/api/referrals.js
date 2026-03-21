/** @file Referrals API helpers. */
import axios from 'axios'
export const getCustomerReferrals = (customerId) => axios.get(`/api/referrals/customer/${customerId}/`)
export const getReferralStats = () => axios.get('/api/referrals/stats/')
