/** @file Campaigns API helpers. */
import axios from 'axios'
const qs = (p) => { const s = p instanceof URLSearchParams ? p.toString() : new URLSearchParams(p || {}).toString(); return s ? `?${s}` : '' }
export const getCampaigns = (params) => axios.get(`/api/campaigns/${qs(params)}`)
export const getCampaign = (id) => axios.get(`/api/campaigns/${id}/`)
export const createCampaign = (data) => axios.post('/api/campaigns/', data)
export const sendCampaign = (id) => axios.post(`/api/campaigns/${id}/send/`)
export const getCampaignRecipients = (id) => axios.get(`/api/campaigns/${id}/recipients/`)
export const previewSegment = (segment) => axios.get('/api/campaigns/segments/preview/', { params: { segment } })
