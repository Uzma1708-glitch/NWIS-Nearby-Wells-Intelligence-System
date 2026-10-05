/**
 * NWIS — SIH Problem Statement 26121 Domain Types
 * ================================================
 * Frontend-only prototype data models.
 * Completely local synthetic dataset types.
 */

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

export type DocumentType = 'WCR' | 'DDR' | 'DRILLING_REPORT' | 'MUD_LOG' | 'CASING_REPORT' | 'OTHER';

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'REVIEWED' | 'CONFIRMED' | 'FAILED';

export interface Formation {
  id: number;
  name: string;
  description: string;
  top_depth: number;
  base_depth: number;
  bottom_depth?: number;
  color?: string;
  lithology?: string;
}

export interface Reservoir {
  id: number;
  name: string;
  description: string;
}

export interface CasingProgram {
  id: number;
  well_name: string;
  hole_size_in?: number;
  casing_size_in?: number;
  casing_size?: string;
  shoe_depth_m: number;
  setting_depth?: number;
  casing_type?: string;
  grade: string;
  weight_ppf?: number;
  weight?: number;
  connection?: string;
  notes?: string;
}

export interface CementingRecord {
  id: number;
  well_name: string;
  casing_size_in?: number;
  depth_m?: number;
  depth?: number;
  slurry_type?: string;
  cement_type?: string;
  slurry_density_sg?: number;
  volume_bbl?: number;
  volume?: number;
  displacement_volume?: number;
  toc_m?: number;
  bond_quality?: string;
  issue?: string | null;
  result?: string;
  notes?: string;
}

export interface MudProgram {
  id: number;
  well_name: string;
  interval_top_m?: number;
  interval_base_m?: number;
  depth?: number;
  mud_type: string;
  density_sg?: number;
  density?: number;
  viscosity_sec?: number;
  viscosity?: number;
  pv_cp?: number;
  yp_lb_100ft2?: number;
  ph?: number | null;
  notes?: string;
}

export interface TrajectoryPoint {
  id: number;
  well_name: string;
  measured_depth: number;
  true_vertical_depth: number;
  inclination_deg?: number;
  inclination?: number;
  azimuth_deg?: number;
  azimuth?: number;
  dogleg_severity?: number;
  latitude: number;
  longitude: number;
}

export interface DrillingParameterPoint {
  id: number;
  well_name: string;
  depth: number;
  rop_m_hr?: number;
  wob_klbs?: number;
  rpm: number;
  torque_knm?: number;
  flow_rate_lpm?: number;
  standpipe_pressure_bar?: number;
  mud_weight_in_sg?: number;
  ecd_sg?: number;
  rop?: number;
  wob?: number;
  torque?: number;
  ecd?: number;
  flow_rate?: number;
  standpipe_pressure?: number;
  spp?: number;
  hookload?: number;
}

export interface EventMitigation {
  id: number;
  event_id: number;
  mitigation: string;
  result?: string;
  success_indicator: 'SUCCESS' | 'PARTIAL' | 'FAILURE' | 'UNKNOWN';
}

export interface OperationalEvent {
  id: number;
  well_name: string;
  event_type: EventType;
  depth: number;
  start_depth?: number;
  end_depth?: number;
  formation_id: number;
  formation_name?: string;
  severity: Severity;
  cause: string;
  description: string;
  outcome: string;
  npt_hours: number;
  event_date: string;
  source_doc?: string;
  source_page?: number;
  mitigation?: string;
  mitigations?: EventMitigation[];
  lessons_learned?: string;
}

export interface Well {
  id: number;
  well_name: string;
  status: WellStatus;
  latitude: number;
  longitude: number;
  total_depth: number;
  current_depth: number;
  formation_id: number;
  formation_name?: string;
  reservoir_id: number;
  reservoir_name?: string;
  spud_date: string;
  completion_date?: string | null;
  operator: string;
  field: string;
  notes?: string;
  distance_km?: number;
  relevance_score?: number;
  relevance_reasons?: string[];
  is_nearby?: boolean;
}

export interface RiskInterval {
  id: number;
  well_name: string;
  risk_type: RiskType;
  start_depth: number;
  end_depth: number;
  top_depth?: number;
  bottom_depth?: number;
  description?: string;
  recommended_mitigation?: string;
  offset_wells?: string[];
  formation_id: number;
  formation_name?: string;
  evidence: string;
  occurrence_count: number;
}

export interface RiskScoreItem {
  risk_type: RiskType;
  label: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  evidence: string[];
  historical_wells: string[];
  mitigation: string;
  explanation: string;
}

export interface ProactiveAlert {
  id: string;
  well_name: string;
  risk_type: RiskType;
  current_depth: number;
  risk_interval: string;
  formation: string;
  severity: Severity;
  message: string;
  historical_wells: string[];
  historical_events: string[];
  evidence: string;
  recommendation: string;
  source_doc: string;
  active: boolean;
}

export interface DocumentItem {
  id: number;
  well_name: string;
  document_type: DocumentType;
  file_name: string;
  file_path?: string;
  file_size?: string;
  status?: DocumentStatus;
  extracted_depth?: number;
  extracted_formation?: string;
  extracted_event?: string;
  extracted_severity?: string;
  extracted_mitigation?: string;
  confidence?: number;
  uploaded_at?: string;
  upload_date?: string;
  review_status?: 'PENDING' | 'CONFIRMED';
}
