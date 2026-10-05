/**
 * NWIS Events API Service
 * ========================
 */

import apiClient from './apiClient';
import type { OperationalEventSummary, OperationalEventDetail } from '../types/domain';

export const eventsApi = {
  getAll: async (params?: { event_type?: string; skip?: number; limit?: number }): Promise<OperationalEventSummary[]> => {
    const resp = await apiClient.get<OperationalEventSummary[]>('/api/events', { params });
    return resp.data;
  },

  getByWell: async (wellId: number, params?: { event_type?: string }): Promise<OperationalEventDetail[]> => {
    const resp = await apiClient.get<OperationalEventDetail[]>(`/api/wells/${wellId}/events`, { params });
    return resp.data;
  },

  getById: async (eventId: number): Promise<OperationalEventDetail> => {
    const resp = await apiClient.get<OperationalEventDetail>(`/api/events/${eventId}`);
    return resp.data;
  },
};
