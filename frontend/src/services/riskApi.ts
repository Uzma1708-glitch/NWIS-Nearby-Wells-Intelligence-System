/**
 * NWIS Risk API Service
 * ======================
 */

import apiClient from './apiClient';
import type { RiskPrediction, RiskInterval, Alert, AlertStatus, Recommendation } from '../types/domain';

export const riskApi = {
  getPredictions: async (wellId: number): Promise<RiskPrediction[]> => {
    const resp = await apiClient.get<RiskPrediction[]>(`/api/risk/${wellId}`);
    return resp.data;
  },

  getIntervals: async (wellId: number, riskType?: string): Promise<RiskInterval[]> => {
    const resp = await apiClient.get<RiskInterval[]>(`/api/risk/${wellId}/intervals`, {
      params: riskType ? { risk_type: riskType } : undefined,
    });
    return resp.data;
  },

  checkDepth: async (wellId: number, depth: number): Promise<{
    well_id: number;
    queried_depth: number;
    in_risk_zone: boolean;
    matching_intervals: Array<{
      id: number;
      risk_type: string;
      start_depth: number;
      end_depth: number;
      evidence?: string;
    }>;
  }> => {
    const resp = await apiClient.get(`/api/risk/${wellId}/check`, { params: { depth } });
    return resp.data;
  },

  getAlerts: async (params?: { status?: string; skip?: number; limit?: number }): Promise<Alert[]> => {
    const resp = await apiClient.get<Alert[]>('/api/alerts', { params });
    return resp.data;
  },

  getWellAlerts: async (wellId: number): Promise<Alert[]> => {
    const resp = await apiClient.get<Alert[]>(`/api/wells/${wellId}/alerts`);
    return resp.data;
  },

  updateAlertStatus: async (alertId: number, status: AlertStatus): Promise<Alert> => {
    const resp = await apiClient.patch<Alert>(`/api/alerts/${alertId}`, { status });
    return resp.data;
  },

  getRecommendations: async (wellId: number, riskType?: string): Promise<Recommendation[]> => {
    const resp = await apiClient.get<Recommendation[]>(`/api/wells/${wellId}/recommendations`, {
      params: riskType ? { risk_type: riskType } : undefined,
    });
    return resp.data;
  },
};

/**
 * Health API
 */
export const healthApi = {
  check: async (): Promise<{ status: string; service: string; database: string }> => {
    const resp = await apiClient.get('/health');
    return resp.data;
  },
};
