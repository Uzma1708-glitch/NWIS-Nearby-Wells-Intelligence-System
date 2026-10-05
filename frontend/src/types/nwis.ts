export interface Well {
  id: string;
  well_id: string;
  well_name: string;
  nitg_number?: string;
  field_name?: string;
  status?: string;
  latitude: number;
  longitude: number;
  end_depth_m: number | null;
  start_date?: string;
  end_date?: string;
  uwi?: string;
  distance_km?: number;
}

export interface ProposedWell {
  lat: number;
  lng: number;
  name: string;
  maxDepth?: number;
}

export interface Formation {
  name: string;
  top: number;
  bottom: number;
  color: string;
  lithology: string;
}

export interface DrillingEvent {
  id: string;
  well_id: string;
  well_name: string;
  nitg_number?: string;
  depth_m: number;
  formation: string;
  event_type: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  mitigation: string;
  source_doc: string;
  source_doc_id: string;
  source_page: number;
  evidence_ref: string;
  distance_km?: number;
  diff?: number;
}

export interface RiskZone {
  top: number;
  bottom: number;
  formation: string;
  events: DrillingEvent[];
  wells: string[];
  severity: 'Low' | 'Medium' | 'High';
  count: number;
}

export interface TelemetryPoint {
  depth: number;
  rop: number;
  wob: number;
  torque: number;
  rpm: number;
  pressure: number;
  mudWeight: number;
}

export interface HazardPrediction {
  class: number;
  label: string;
  conf: number;
}
