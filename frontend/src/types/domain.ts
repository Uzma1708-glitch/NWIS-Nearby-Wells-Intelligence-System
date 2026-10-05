/**
 * NWIS TypeScript Domain Types
 * ==============================
 * Mirrors the backend Pydantic schemas and domain enumerations.
 * Keep in sync with backend API contract.
 */

// ── Enumerations ──────────────────────────────────────────────────────────────

export type WellStatus = 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'ABANDONED' | 'PLANNED';

export type EventType =
  | 'MUD_LOSS'
  | 'KICK'
  | 'STUCK_PIPE'
  | 'TORQUE_SPIKE'
  | 'OVERPRESSURE'
  | 'FISHING'
  | 'NPT'
  | 'CEMENTING_ISSUE'
  | 'OTHER';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskType =
  | 'MUD_LOSS'
  | 'STUCK_PIPE'
  | 'OVERPRESSURE'
  | 'TORQUE_SPIKE'
  | 'CEMENTING_ISSUE'
  | 'KICK'
  | 'OTHER';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

// ── Core Domain Types ──────────────────────────────────────────────────────────

export interface Formation {
  id: number;
  name: string;
  description?: string;
  top_depth?: number;
  base_depth?: number;
  created_at: string;
  updated_at: string;
}

export interface Reservoir {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface WellSummary {
  id: number;
  well_name: string;
  status: WellStatus;
  latitude?: number;
  longitude?: number;
  total_depth?: number;
  current_depth?: number;
  formation_id?: number;
  reservoir_id?: number;
  operator?: string;
  field?: string;
}

export interface WellDetail extends WellSummary {
  spud_date?: string;
  completion_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  formation?: Formation;
  reservoir?: Reservoir;
}

export interface NearbyWell extends WellSummary {
  distance_km: number;
}

export interface EventMitigation {
  id: number;
  event_id: number;
  mitigation: string;
  result?: string;
  success_indicator?: 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'UNKNOWN';
  notes?: string;
  created_at: string;
}

export interface OperationalEventSummary {
  id: number;
  well_id: number;
  event_type: EventType;
  depth?: number;
  severity?: Severity;
  description?: string;
  event_date?: string;
  created_at: string;
}

export interface OperationalEventDetail extends OperationalEventSummary {
  start_depth?: number;
  end_depth?: number;
  formation_id?: number;
  cause?: string;
  outcome?: string;
  npt_hours?: number;
  updated_at: string;
  mitigations: EventMitigation[];
}

export interface RiskPrediction {
  id: number;
  well_id: number;
  risk_type: RiskType;
  depth?: number;
  score?: number;
  confidence?: number;
  explanation?: string;
  model_version?: string;
  created_at: string;
}

export interface RiskInterval {
  id: number;
  well_id: number;
  risk_type: RiskType;
  start_depth: number;
  end_depth: number;
  formation_id?: number;
  evidence?: string;
  occurrence_count?: number;
  created_at: string;
}

export interface Alert {
  id: number;
  well_id: number;
  risk_type: RiskType;
  depth?: number;
  severity: Severity;
  message: string;
  status: AlertStatus;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: number;
  well_id: number;
  risk_type: RiskType;
  recommendation: string;
  evidence?: string;
  source_event_id?: number;
  priority?: number;
  created_at: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  database: 'connected' | 'unavailable';
}
