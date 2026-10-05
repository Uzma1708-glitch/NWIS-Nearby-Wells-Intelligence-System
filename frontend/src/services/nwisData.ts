import type { Well, Formation, DrillingEvent, RiskZone } from '../types/nwis';

export const FORMATIONS: Formation[] = [
  { name: 'North Sea Group', top: 0, bottom: 300, color: '#d9c9a3', lithology: 'Shallow marine sands & clays' },
  { name: 'Boxtel / Breda Fm.', top: 300, bottom: 700, color: '#cbb88c', lithology: 'Fine-grained sands, glauconitic' },
  { name: 'Rupel Clay (Veldhoven)', top: 700, bottom: 1200, color: '#8d9aae', lithology: 'Stiff marine clay' },
  { name: 'Landen / Belgium Gp.', top: 1200, bottom: 1700, color: '#b3a47a', lithology: 'Sandy clay, marl' },
  { name: 'Chalk Group', top: 1700, bottom: 2300, color: '#cdbfa0', lithology: 'Chalk, chert stringers' },
  { name: 'Rijnland / Scruff Gp.', top: 2300, bottom: 2900, color: '#a8967a', lithology: 'Sand & shale intervals' },
  { name: 'Triassic Buntsandstein', top: 2900, bottom: 3600, color: '#8f7d6a', lithology: 'Clastic, evaporite stringers' }
];

export const SEARCH_RADII = [1, 2, 5, 10, 20];

export const EVENT_TYPES = [
  'Mud Loss',
  'Stuck Pipe',
  'Kick',
  'Overpressure',
  'High Torque',
  'Cementing Issue',
  'Fishing',
  'NPT',
  'Other Operational Event'
] as const;

export const EVENT_SEVERITIES = ['Low', 'Medium', 'High'] as const;

export const EVENT_COLORS: Record<string, string> = {
  'Mud Loss': '#b45309',
  'Stuck Pipe': '#0d7d7d',
  'Kick': '#b91c1c',
  'Overpressure': '#9a3412',
  'High Torque': '#3b5e7e',
  'Cementing Issue': '#6b7280',
  'Fishing': '#7c3aed',
  'NPT': '#475569',
  'Other Operational Event': '#64748b'
};

export function getFormationForDepth(depth: number): Formation {
  const d = Number(depth) || 0;
  return FORMATIONS.find(f => d >= f.top && d < f.bottom) || FORMATIONS[FORMATIONS.length - 1];
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export function getNearbyWells(wells: Well[], lat: number, lng: number, radiusKm: number): Well[] {
  return wells
    .map(w => ({
      ...w,
      distance_km: haversineDistance(lat, lng, w.latitude, w.longitude)
    }))
    .filter(w => (w.distance_km ?? Infinity) <= radiusKm)
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
}

// 32-bit FNV-1a hash
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Mulberry32 seeded PRNG
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 1831565813) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface EventTemplate {
  type: string;
  sev: ('Low' | 'Medium' | 'High')[];
  desc: (formation: string, depth: number) => string;
  mit: string;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: 'Mud Loss',
    sev: ['Medium', 'High'],
    desc: (f, d) => `Partial-to-total mud losses while drilling ${f} at ${d} m. Standpipe pressure dropped and pit volume fell sharply.`,
    mit: 'Pumped LCM pill (fine + coarse), reduced flow rate, conditioned mud weight up in steps.'
  },
  {
    type: 'Stuck Pipe',
    sev: ['Medium', 'High'],
    desc: (f, d) => `Pipe stuck while pulling out of hole through ${f} at ${d} m. No circulation impairment initially.`,
    mit: 'Worked pipe with differential torque, applied spotting fluid, regained mobility after 6 h.'
  },
  {
    type: 'Kick',
    sev: ['High'],
    desc: (f, d) => `Inflow detected at ${d} m in ${f}; pit gain observed. Well shut-in per procedure.`,
    mit: 'Closed BOP, circulated influx out via driller method, increased mud weight to balance formation pressure.'
  },
  {
    type: 'Overpressure',
    sev: ['Medium', 'High'],
    desc: (f, d) => `Rising background gas and decreasing cuttings density in ${f} at ${d} m indicated overpressured interval.`,
    mit: 'Raised mud weight in 0.1 ppg steps, maintained ECD within window.'
  },
  {
    type: 'High Torque',
    sev: ['Low', 'Medium'],
    desc: (f, d) => `Sustained elevated torque and drag while rotating through ${f} at ${d} m.`,
    mit: 'Wiper trip, swept hole, increased lubricity additive in mud system.'
  },
  {
    type: 'Cementing Issue',
    sev: ['Low', 'Medium'],
    desc: (f, d) => `Poor cement bond across ${f} at ${d} m; CBL indicated channeling.`,
    mit: 'Performed remedial squeeze cement job, re-logged bond until acceptable.'
  },
  {
    type: 'Fishing',
    sev: ['Medium', 'High'],
    desc: (f, d) => `Lost bottomhole assembly at ${d} m in ${f}; fish recovered after multiple runs.`,
    mit: 'Deployed overshot, recovered assembly; NPT of ~1.5 days incurred.'
  },
  {
    type: 'NPT',
    sev: ['Low', 'Medium'],
    desc: (f, d) => `Non-productive time due to equipment failure while at ${d} m in ${f}.`,
    mit: 'Replaced failed component, resumed operations; logged in daily report.'
  },
  {
    type: 'Other Operational Event',
    sev: ['Low'],
    desc: (f, d) => `Minor operational anomaly recorded in ${f} at ${d} m during routine drilling.`,
    mit: 'Monitored parameters; no further action required.'
  }
];

export function generateWellEvents(well: Well): DrillingEvent[] {
  const depth = Number(well.end_depth_m) || 0;
  if (!depth || depth < 150) return [];
  const rng = mulberry32(fnv1a(well.well_id));
  const eventCount = Math.floor(rng() * 3.4);
  const events: DrillingEvent[] = [];

  for (let i = 0; i < eventCount; i++) {
    const eventDepth = Math.round(150 + rng() * (depth - 150));
    const formation = getFormationForDepth(eventDepth).name;
    const template = EVENT_TEMPLATES[Math.floor(rng() * EVENT_TEMPLATES.length)];
    const severity = template.sev[Math.floor(rng() * template.sev.length)];
    const page = 1 + Math.floor(rng() * 42);

    events.push({
      id: `${well.well_id}-E${i}`,
      well_id: well.well_id,
      well_name: well.well_name,
      nitg_number: well.nitg_number,
      depth_m: eventDepth,
      formation,
      event_type: template.type,
      severity,
      description: template.desc(formation, eventDepth),
      mitigation: template.mit,
      source_doc: `${well.well_name} — Daily Drilling Report`,
      source_doc_id: `DDR-${well.nitg_number || well.well_id}`,
      source_page: page,
      evidence_ref: `${well.nitg_number || well.well_id} · p.${page} · ${template.type}`,
      distance_km: well.distance_km
    });
  }

  return events;
}

export function getAllHistoricalEvents(nearbyWells: Well[]): DrillingEvent[] {
  return nearbyWells.flatMap(generateWellEvents).sort((a, b) => a.depth_m - b.depth_m);
}

export function computeRiskZones(events: DrillingEvent[], windowSize = 50): RiskZone[] {
  const buckets: Record<number, DrillingEvent[]> = {};
  events.forEach(e => {
    const bucket = Math.floor(e.depth_m / windowSize) * windowSize;
    (buckets[bucket] ||= []).push(e);
  });

  const zones: RiskZone[] = [];
  Object.entries(buckets).forEach(([depthStr, evts]) => {
    const top = Number(depthStr);
    const hasHigh = evts.some(e => e.severity === 'High');
    if (evts.length >= 2 || hasHigh) {
      zones.push({
        top,
        bottom: top + windowSize,
        formation: getFormationForDepth(top + windowSize / 2).name,
        events: evts,
        wells: [...new Set(evts.map(e => e.well_id))],
        severity: hasHigh ? 'High' : 'Medium',
        count: evts.length
      });
    }
  });

  return zones.sort((a, b) => a.top - b.top);
}

export function computeDemoDepth(events: DrillingEvent[]): number {
  if (!events.length) return 0;
  const counts: Record<number, number> = {};
  events.forEach(e => {
    const bucket = Math.floor(e.depth_m / 50) * 50;
    counts[bucket] = (counts[bucket] || 0) + 1;
  });

  let bestDepth = 0;
  let maxCount = 0;
  Object.entries(counts).forEach(([depthStr, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestDepth = Number(depthStr);
    }
  });

  return bestDepth + 25;
}

export function findDemoWellCluster(wells: Well[]): { lat: number; lng: number; maxDepth: number } {
  const deepWells = wells.filter(w => Number(w.end_depth_m) >= 1500);
  const pool = deepWells.length >= 8 ? deepWells : wells;
  const clusters: Record<string, Well[]> = {};
  const gridSize = 0.25;

  pool.forEach(w => {
    const key = `${Math.round(w.latitude / gridSize) * gridSize},${Math.round(w.longitude / gridSize) * gridSize}`;
    (clusters[key] ||= []).push(w);
  });

  let bestCluster: Well[] | null = null;
  let maxLen = 0;
  Object.values(clusters).forEach(c => {
    if (c.length > maxLen) {
      maxLen = c.length;
      bestCluster = c;
    }
  });

  if (!bestCluster) {
    return { lat: 52.215, lng: 6.815, maxDepth: 2400 };
  }

  const avgLat = (bestCluster as Well[]).reduce((sum, w) => sum + w.latitude, 0) / (bestCluster as Well[]).length;
  const avgLng = (bestCluster as Well[]).reduce((sum, w) => sum + w.longitude, 0) / (bestCluster as Well[]).length;
  const maxDepth = Math.max(...(bestCluster as Well[]).map(w => Number(w.end_depth_m) || 0));

  return { lat: avgLat, lng: avgLng, maxDepth: Math.min(maxDepth, 3200) };
}

let cachedWells: Well[] | null = null;

export async function fetchWells(): Promise<Well[]> {
  if (cachedWells && cachedWells.length > 0) {
    return cachedWells;
  }

  // 1. Try local data file first for instant zero-latency loading
  try {
    const resp = await fetch('/data/wells.json');
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedWells = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('Local wells.json fetch failed, falling back to live API...', err);
  }

  // 2. Fallback to API endpoint
  try {
    const res = await fetch('https://drill-sight-nwis.base44.app/api/entities/Well?limit=1000&sort=-created_date');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        cachedWells = data;
        return data;
      }
    }
  } catch (err) {
    console.error('Remote API fetch failed:', err);
  }

  return [];
}
