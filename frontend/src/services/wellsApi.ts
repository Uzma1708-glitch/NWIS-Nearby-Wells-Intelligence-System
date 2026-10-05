/**
 * NWIS Wells API Service
 * =======================
 * All well-related API calls. Components import from here, not from apiClient directly.
 */

import apiClient from './apiClient';
import type { WellSummary, WellDetail, NearbyWell } from '../types/domain';

export const wellsApi = {
  /** List all wells */
  getAll: async (params?: { status?: string; skip?: number; limit?: number }): Promise<WellSummary[]> => {
    const resp = await apiClient.get<WellSummary[]>('/api/wells', { params });
    return resp.data;
  },

  /** Get well detail by ID */
  getById: async (id: number): Promise<WellDetail> => {
    const resp = await apiClient.get<WellDetail>(`/api/wells/${id}`);
    return resp.data;
  },

  /** Find wells within radius of coordinates */
  getNearby: async (params: {
    latitude: number;
    longitude: number;
    radius_km?: number;
    exclude_well_id?: number;
  }): Promise<NearbyWell[]> => {
    const resp = await apiClient.get<NearbyWell[]>('/api/wells/nearby', { params });
    return resp.data;
  },
};
