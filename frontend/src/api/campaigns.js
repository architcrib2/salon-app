/** @file Campaigns API helpers. */
import axios from 'axios'
export const getCampaigns = () => axios.get('/api/campaigns/')
export const getCampaign = (id) => axios.get(`/api/campaigns/${id}/`)
export const createCampaign = (data) => axios.post('/api/campaigns/', data)
export const sendCampaign = (id) => axios.post(`/api/campaigns/${id}/send/`)
export const getCampaignRecipients = (id) => axios.get(`/api/campaigns/${id}/recipients/`)
export const previewSegment = (segment) => axios.get('/api/campaigns/segments/preview/', { params: { segment } })
