import rawSeedData from '../data/sihSeedData.json' with { type: 'json' };
import type {
  Well,
  Formation,
  Reservoir,
  OperationalEvent,
  RiskInterval,
  RiskScoreItem,
  RiskType,
  ProactiveAlert,
  DocumentItem,
  TrajectoryPoint,
  DrillingParameterPoint,
  CasingProgram,
  CementingRecord,
  MudProgram
} from '../types/sihDomain';

// Haversine distance in km
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate explainable Offset Relevance
export function calculateOffsetRelevance(
  activeWell: Well,
  offsetWell: Well,
  events: OperationalEvent[]
): { score: number; reasons: string[] } {
  if (offsetWell.well_name === activeWell.well_name) {
    return { score: 100, reasons: ['Active well reference'] };
  }

  const distance = offsetWell.distance_km ?? calculateDistance(
    activeWell.latitude,
    activeWell.longitude,
    offsetWell.latitude,
    offsetWell.longitude
  );

  let score = 0;
  const reasons: string[] = [];

  // 1. Geographic Proximity (up to 35 pts)
  if (distance <= 2.5) {
    score += 35;
    reasons.push(`✓ Close geographic distance (${distance.toFixed(1)} km)`);
  } else if (distance <= 5.0) {
    score += 25;
    reasons.push(`✓ Moderate proximity (${distance.toFixed(1)} km)`);
  } else if (distance <= 10.0) {
    score += 15;
    reasons.push(`✓ Regional field proximity (${distance.toFixed(1)} km)`);
  } else {
    score += 5;
    reasons.push(`• Distant regional well (${distance.toFixed(1)} km)`);
  }

  // 2. Formation Similarity (up to 25 pts)
  if (offsetWell.formation_id === activeWell.formation_id) {
    score += 25;
    reasons.push(`✓ Same target formation (${activeWell.formation_name || 'F3'})`);
  } else {
    reasons.push(`• Different target formation (${offsetWell.formation_name || 'F2'})`);
  }

  // 3. Reservoir Similarity (up to 15 pts)
  if (offsetWell.reservoir_id === activeWell.reservoir_id) {
    score += 15;
    reasons.push(`✓ Shared reservoir interval (${activeWell.reservoir_name || 'R-Beta'})`);
  }

  // 4. Depth Overlap (up to 15 pts)
  if (offsetWell.total_depth >= activeWell.current_depth) {
    score += 15;
    reasons.push(`✓ Full depth coverage (${offsetWell.total_depth}m reaches active ${activeWell.current_depth}m)`);
  } else {
    score += 5;
    reasons.push(`• Partial depth overlap (${offsetWell.total_depth}m TD)`);
  }

  // 5. Historical Event Similarity (up to 10 pts)
  const wellEvents = events.filter(e => e.well_name === offsetWell.well_name);
  if (wellEvents.some(e => e.event_type === 'MUD_LOSS' || e.event_type === 'STUCK_PIPE' || e.event_type === 'TORQUE_SPIKE')) {
    score += 10;
    const types = [...new Set(wellEvents.map(e => e.event_type.replace('_', ' ')))].join(', ');
    reasons.push(`✓ Recorded comparable critical events (${types})`);
  }

  return { score: Math.min(100, Math.max(10, score)), reasons };
}

// Initial structured data generator
export function getInitialSihData() {
  const formations: Formation[] = rawSeedData.formations.map((f: any) => ({
    ...f,
    color: f.name === 'F1' ? '#a3b899' : f.name === 'F2' ? '#d9b382' : f.name === 'F3' ? '#cd7f32' : '#8b5a2b',
    lithology: f.name === 'F1' ? 'Shallow sands & claystone' : f.name === 'F2' ? 'Interbedded shale & sandstone' : f.name === 'F3' ? 'Fractured limestone & porous sandstone' : 'Dense crystalline basement'
  }));

  const reservoirs: Reservoir[] = rawSeedData.reservoirs;
  const formationMap = Object.fromEntries(formations.map(f => [f.id, f.name]));
  const reservoirMap = Object.fromEntries(reservoirs.map(r => [r.id, r.name]));

  // Reference active well X17
  const x17Ref = rawSeedData.wells.find((w: any) => w.well_name === 'X17') || rawSeedData.wells[0];

  const wells: Well[] = rawSeedData.wells.map((w: any) => {
    const dist = w.well_name === 'X17' ? 0 : calculateDistance(x17Ref.latitude, x17Ref.longitude, w.latitude, w.longitude);
    return {
      ...w,
      formation_name: formationMap[w.formation_id] || 'F3',
      reservoir_name: reservoirMap[w.reservoir_id] || 'R-Beta',
      distance_km: Number(dist.toFixed(2)),
      is_nearby: dist <= 5.0
    };
  });

  const activeWell = wells.find(w => w.well_name === 'X17') || wells[0];

  const events: OperationalEvent[] = rawSeedData.events.map((e: any) => ({
    ...e,
    formation_name: formationMap[e.formation_id] || 'F3',
    source_doc: e.well_name === 'X12' ? 'DDR_X12_3845.pdf' : e.well_name === 'X09' ? 'DDR_X09_3818.pdf' : 'WCR_OFFSET.pdf',
    source_page: e.depth === 3845 ? 4 : e.depth === 3862 ? 7 : e.depth === 3890 ? 12 : 3,
    lessons_learned: e.outcome || 'Apply bridging LCM pill immediately upon detection and maintain ECD envelope.'
  }));

  // Decorate wells with explainable relevance relative to X17
  wells.forEach(w => {
    const rel = calculateOffsetRelevance(activeWell, w, events);
    w.relevance_score = rel.score;
    w.relevance_reasons = rel.reasons;
  });

  const documents: DocumentItem[] = rawSeedData.documents.map((d: any) => {
    const fName = d.file_name || d.filename || 'DDR_REPORT.pdf';
    return {
      ...d,
      file_name: fName,
      extracted_depth: fName.includes('3845') ? 3845 : 3818,
      extracted_formation: 'F3',
      extracted_event: fName.includes('3845') ? 'MUD_LOSS' : 'TORQUE_SPIKE',
      extracted_severity: 'HIGH',
      extracted_mitigation: 'Pumped 50-bbl mixed coarse/medium LCM pill. Lowered flow rate to 1400 lpm to reduce ECD to 1.08 sg.',
      confidence: 0.92,
      review_status: 'CONFIRMED'
    };
  });

  const riskIntervals: RiskInterval[] = rawSeedData.risk_intervals.map((r: any) => ({
    ...r,
    formation_name: formationMap[r.formation_id] || 'F3'
  }));

  const wellIdMap: Record<number, string> = Object.fromEntries(rawSeedData.wells.map((w: any) => [w.id, w.well_name]));

  const trajectories: TrajectoryPoint[] = ((rawSeedData as any).trajectories || []).map((t: any) => ({
    ...t,
    well_name: wellIdMap[t.well_id] || 'X17',
    inclination_deg: t.inclination ?? 0,
    azimuth_deg: t.azimuth ?? 45,
    dogleg_severity: 0
  }));

  // Generate multi-well drilling parameters across demonstration depth range (3750m to 3950m)
  const wellConfigs: Record<string, {
    baseTorque: number;
    baseRop: number;
    baseWob: number;
    baseEcd: number;
    maxDepth: number;
    anomalies: Array<{ depth: number; torque?: number; rop?: number; wob?: number; ecd?: number; span?: number }>;
  }> = {
    'X17': {
      baseTorque: 15.5,
      baseRop: 24,
      baseWob: 18.5,
      baseEcd: 1.11,
      maxDepth: 3842, // Active well current depth
      anomalies: [
        { depth: 3842, torque: 24.5, rop: 12, wob: 22, ecd: 1.12, span: 20 }
      ]
    },
    'X12': {
      baseTorque: 16.0,
      baseRop: 22,
      baseWob: 19.0,
      baseEcd: 1.13,
      maxDepth: 3950,
      anomalies: [
        { depth: 3845, ecd: 1.04, rop: 14, torque: 19, span: 12 }, // Mud Loss at 3845m
        { depth: 3862, torque: 34.2, rop: 5.5, wob: 26.5, span: 14 } // Severe Torque Spike at 3862m
      ]
    },
    'X09': {
      baseTorque: 15.0,
      baseRop: 20,
      baseWob: 18.0,
      baseEcd: 1.12,
      maxDepth: 3920,
      anomalies: [
        { depth: 3818, ecd: 1.05, torque: 27.5, rop: 10.5, span: 12 } // Mud Loss at 3818m
      ]
    },
    'X21': {
      baseTorque: 17.0,
      baseRop: 21,
      baseWob: 19.5,
      baseEcd: 1.12,
      maxDepth: 3980,
      anomalies: [
        { depth: 3858, torque: 36.0, rop: 2.0, wob: 30.0, span: 14 } // Stuck Pipe at 3858m
      ]
    },
    'X07': {
      baseTorque: 16.2,
      baseRop: 22,
      baseWob: 18.2,
      baseEcd: 1.12,
      maxDepth: 3900,
      anomalies: [
        { depth: 3837, ecd: 1.06, torque: 23.0, rop: 14.0, span: 12 } // Mud Loss at 3837m
      ]
    },
    'X15': {
      baseTorque: 14.5,
      baseRop: 25,
      baseWob: 17.0,
      baseEcd: 1.11,
      maxDepth: 3890,
      anomalies: [
        { depth: 3870, torque: 21.0, rop: 17.5, span: 12 }
      ]
    }
  };

  const drillingParameters: DrillingParameterPoint[] = [];
  let paramId = 1;

  Object.entries(wellConfigs).forEach(([wName, cfg]) => {
    for (let d = 3750; d <= cfg.maxDepth; d += 5) {
      let torque = cfg.baseTorque + Math.sin(d / 18) * 1.8;
      let rop = cfg.baseRop + Math.cos(d / 15) * 2.5;
      let wob = cfg.baseWob + Math.sin(d / 22) * 1.2;
      let ecd = cfg.baseEcd + Math.sin(d / 30) * 0.01;

      // Apply specific anomalies around incident depths
      cfg.anomalies.forEach(anom => {
        const dist = Math.abs(d - anom.depth);
        const span = anom.span || 10;
        if (dist <= span) {
          const factor = Math.cos((dist / span) * (Math.PI / 2));
          if (anom.torque !== undefined) torque += (anom.torque - cfg.baseTorque) * factor;
          if (anom.rop !== undefined) rop += (anom.rop - cfg.baseRop) * factor;
          if (anom.wob !== undefined) wob += (anom.wob - cfg.baseWob) * factor;
          if (anom.ecd !== undefined) ecd += (anom.ecd - cfg.baseEcd) * factor;
        }
      });

      drillingParameters.push({
        id: paramId++,
        well_name: wName,
        depth: d,
        rop_m_hr: Number(Math.max(0, rop).toFixed(1)),
        wob_klbs: Number(Math.max(5, wob).toFixed(1)),
        rpm: 90 + Math.round(Math.sin(d / 10) * 8),
        torque_knm: Number(Math.max(4, torque).toFixed(1)),
        flow_rate_lpm: 1550,
        standpipe_pressure_bar: 220,
        mud_weight_in_sg: 1.12,
        ecd_sg: Number(Math.max(0.95, ecd).toFixed(2))
      });
    }
  });

  const casingPrograms: CasingProgram[] = ((rawSeedData as any).casing_programs || []).map((c: any) => ({
    ...c,
    well_name: wellIdMap[c.well_id] || 'X17',
    shoe_depth_m: c.setting_depth || 3500,
    casing_type: c.casing_size || '9-5/8"',
    hole_size_in: 12.25,
    casing_size_in: parseFloat(c.casing_size) || 9.625,
    weight_ppf: c.weight || 47
  }));

  const cementingRecords: CementingRecord[] = ((rawSeedData as any).cementing_records || []).map((cm: any) => ({
    ...cm,
    well_name: wellIdMap[cm.well_id] || 'X17',
    depth_m: cm.depth,
    slurry_type: cm.cement_type || 'Class G Neat',
    slurry_density_sg: 1.90,
    volume_bbl: cm.volume || 120,
    bond_quality: cm.result || 'Good CBL Isolation'
  }));

  const mudPrograms: MudProgram[] = ((rawSeedData as any).mud_programs || []).map((m: any) => ({
    ...m,
    well_name: wellIdMap[m.well_id] || 'X17',
    interval_top_m: Math.max(0, (m.depth || 3500) - 500),
    interval_base_m: m.depth || 3500,
    density_sg: m.density || 1.15,
    viscosity_sec: m.viscosity || 48
  }));

  return {
    formations,
    reservoirs,
    wells,
    activeWell,
    events,
    documents,
    riskIntervals,
    trajectories,
    drillingParameters,
    casingPrograms,
    cementingRecords,
    mudPrograms
  };
}

// Recalculate all distances and offset relevance dynamically when active well or radius changes
export function recalculateAllDistancesAndRelevance(
  activeWell: Well,
  allWells: Well[],
  events: OperationalEvent[],
  radiusKm: number = 5.0
): Well[] {
  return allWells.map(w => {
    const isSelf = w.well_name === activeWell.well_name;
    const dist = isSelf ? 0 : calculateDistance(activeWell.latitude, activeWell.longitude, w.latitude, w.longitude);
    const roundedDist = Number(dist.toFixed(2));
    const isNearby = !isSelf && roundedDist <= radiusKm;
    const rel = calculateOffsetRelevance(activeWell, { ...w, distance_km: roundedDist }, events);
    return {
      ...w,
      distance_km: roundedDist,
      is_nearby: isNearby,
      relevance_score: isSelf ? 100 : rel.score,
      relevance_reasons: isSelf ? ['Active well reference'] : rel.reasons
    };
  });
}

// Calculate dynamic Risk Scores based on current active depth and available offset events
export function calculateRiskScoresForDepth(
  currentDepth: number,
  events?: OperationalEvent[],
  activeWell?: Well,
  nearbyWells?: Well[]
): RiskScoreItem[] {
  const wellName = activeWell?.well_name || 'X17';
  const nearbyNames = new Set((nearbyWells || []).filter(w => w.well_name !== wellName).map(w => w.well_name));
  const relevantEvents = (events || []).filter(e =>
    (nearbyNames.size === 0 || nearbyNames.has(e.well_name)) &&
    Math.abs(e.depth - currentDepth) <= 120
  );

  const mudEvents = relevantEvents.filter(e => e.event_type === 'MUD_LOSS');
  const torqueEvents = relevantEvents.filter(e => e.event_type === 'TORQUE_SPIKE');
  const stuckEvents = relevantEvents.filter(e => e.event_type === 'STUCK_PIPE');
  const kickEvents = relevantEvents.filter(e => e.event_type === 'KICK');
  const cementingEvents = relevantEvents.filter(e => e.event_type === 'CEMENTING_ISSUE');

  // Base scores modulated by actual historical event presence
  const mudLossScore = mudEvents.length > 0 ? Math.min(95, 60 + mudEvents.length * 10) : (currentDepth >= 3810 && currentDepth <= 3870 ? 87 : 20);
  const torqueSpikeScore = torqueEvents.length > 0 ? Math.min(92, 55 + torqueEvents.length * 12) : (currentDepth >= 3810 && currentDepth <= 3870 ? 81 : 18);
  const stuckPipeScore = stuckEvents.length > 0 ? Math.min(90, 50 + stuckEvents.length * 12) : (currentDepth >= 3850 ? 68 : 15);
  const kickScore = kickEvents.length > 0 ? Math.min(85, 45 + kickEvents.length * 15) : 20;
  const cementingScore = cementingEvents.length > 0 ? Math.min(80, 40 + cementingEvents.length * 15) : 24;

  const buildEvidence = (evList: OperationalEvent[], fallback: string[]) => {
    if (evList.length > 0) {
      return evList.map(e => `${e.well_name} → ${e.depth}m (${e.severity} severity, ${e.cause || e.outcome || 'offset occurrence'})`);
    }
    return fallback;
  };

  const buildWells = (evList: OperationalEvent[], fallback: string[]) => {
    if (evList.length > 0) {
      return [...new Set(evList.map(e => e.well_name))];
    }
    return fallback;
  };

  return [
    {
      risk_type: 'MUD_LOSS',
      label: 'Mud Loss',
      score: mudLossScore,
      level: mudLossScore >= 80 ? 'HIGH' : mudLossScore >= 50 ? 'MEDIUM' : 'LOW',
      confidence: 0.89,
      evidence: buildEvidence(mudEvents, [
        'X12 → 3845m (High severity loss of 25 bbl/hr in natural fracture zone)',
        'X09 → 3818m (Medium severity loss at formation boundary)',
        'X21 → 3818m (High severity loss observed)',
        'X07 → 3837m (Medium severity loss)'
      ]),
      historical_wells: buildWells(mudEvents, ['X12', 'X09', 'X21', 'X07']),
      mitigation: 'Pump 50-bbl LCM pill (mixed coarse/medium bridging blend), reduce flow rate to 1400 lpm, lower ECD to 1.08 sg.',
      explanation: `Historical frequency on offset wells near ${currentDepth}m demonstrates fracture permeability hazards.`
    },
    {
      risk_type: 'TORQUE_SPIKE',
      label: 'Torque Spike / Drag',
      score: torqueSpikeScore,
      level: torqueSpikeScore >= 80 ? 'HIGH' : torqueSpikeScore >= 50 ? 'MEDIUM' : 'LOW',
      confidence: 0.85,
      evidence: buildEvidence(torqueEvents, [
        'X12 → 3862m (Torque surged from 18 to 34 kNm with severe stick-slip)',
        'X09 → 3862m (Elevated torque spike in tight interval)'
      ]),
      historical_wells: buildWells(torqueEvents, ['X12', 'X09']),
      mitigation: 'Reduce WOB from 25 klbs to 15 klbs, increase RPM to 120, treat drilling fluid with 3% lubricity additive.',
      explanation: `Tight hole and mud cake buildup in permeable intervals triggers differential drag.`
    },
    {
      risk_type: 'STUCK_PIPE',
      label: 'Differential Sticking',
      score: stuckPipeScore,
      level: stuckPipeScore >= 60 ? 'HIGH' : stuckPipeScore >= 40 ? 'MEDIUM' : 'LOW',
      confidence: 0.82,
      evidence: buildEvidence(stuckEvents, [
        'X12 → 3890m (Critical stuck pipe during connection, 42 hours NPT incurred)',
        'X21 → 3858m (Stuck pipe requiring jarring and spotting fluid)'
      ]),
      historical_wells: buildWells(stuckEvents, ['X12', 'X21']),
      mitigation: 'Do not leave drill string stationary for >10 mins during connections. Maintain continuous rotation and have spotting fluid ready.',
      explanation: 'High differential overbalance across permeable sand lenses creates severe sticking hazard.'
    },
    {
      risk_type: 'KICK',
      label: 'Overpressure / Kick',
      score: kickScore,
      level: kickScore >= 60 ? 'HIGH' : kickScore >= 40 ? 'MEDIUM' : 'LOW',
      confidence: 0.74,
      evidence: buildEvidence(kickEvents, ['F3 lower transition shows pore pressure gradient rise to 1.15 sg in regional offset X11']),
      historical_wells: buildWells(kickEvents, ['X11']),
      mitigation: 'Monitor flow check closely on drilling breaks. Verify trip sheet balances and keep BOP lined up.',
      explanation: 'Permeable carbonate stringers exhibit localized pressure anomalies.'
    },
    {
      risk_type: 'CEMENTING_ISSUE',
      label: 'Cement Channeling',
      score: cementingScore,
      level: cementingScore >= 50 ? 'MEDIUM' : 'LOW',
      confidence: 0.71,
      evidence: buildEvidence(cementingEvents, ['X11 recorded poor CBL bond quality across section requiring squeeze job']),
      historical_wells: buildWells(cementingEvents, ['X11']),
      mitigation: 'Use pre-flush spacer and centralizers every joint across the permeable interval.',
      explanation: 'Potential washouts and micro-fractures compromise cement isolation.'
    }
  ];
}

// Evaluate Proactive Alert for active well
export function evaluateProactiveAlert(
  currentDepth: number,
  activeWell?: Well,
  nearbyWells?: Well[],
  events?: OperationalEvent[],
  lookaheadDistance: number = 100
): ProactiveAlert | null {
  const wellName = activeWell?.well_name || 'X17';
  const formation = activeWell?.formation_name || 'F3';

  // Dynamic evaluation using activeWell + nearby offsets + events
  if (activeWell && nearbyWells && events) {
    const startDepth = Math.max(0, currentDepth - 10);
    const endDepth = currentDepth + lookaheadDistance;

    const offsetWells = nearbyWells.filter(w => w.well_name !== wellName);
    const offsetNames = new Set(offsetWells.map(w => w.well_name));

    const matchingEvents = events.filter(e =>
      offsetNames.has(e.well_name) &&
      e.depth >= startDepth &&
      e.depth <= endDepth
    );

    if (matchingEvents.length === 0) {
      return null;
    }

    const criticalEvent = matchingEvents.find(e => e.severity === 'CRITICAL');
    const highEvent = matchingEvents.find(e => e.severity === 'HIGH');
    const primaryEvent = criticalEvent || highEvent || matchingEvents[0];

    const affectedWells = [...new Set(matchingEvents.map(e => e.well_name))];
    const eventSummaries = matchingEvents.map(e => `${e.event_type.replace('_', ' ')} (${e.depth}m)`);
    const uniqueSummaries = [...new Set(eventSummaries)];

    const severity = primaryEvent.severity || 'HIGH';
    const primaryType = primaryEvent.event_type;
    const mappedRiskType: RiskType = (
      primaryType === 'MUD_LOSS' || primaryType === 'STUCK_PIPE' || primaryType === 'OVERPRESSURE' ||
      primaryType === 'TORQUE_SPIKE' || primaryType === 'CEMENTING_ISSUE' || primaryType === 'KICK'
    ) ? primaryType : 'OTHER';

    const sourceDoc = primaryEvent.source_doc || (primaryEvent.well_name === 'X12' ? 'DDR_X12_3845.pdf (Page 4)' : 'WCR_OFFSET.pdf');
    const recommendation = primaryEvent.mitigation ||
      (primaryType === 'MUD_LOSS'
        ? 'Prepare 50-bbl LCM pill on surface, lower flow rate to control downhole ECD below 1.08 sg, and monitor pit levels.'
        : primaryType === 'STUCK_PIPE'
        ? 'Continuous string rotation required. Maximum 10-minute connections. Ready spotting fluid at rigsite.'
        : 'Maintain tight parameter envelope and conduct wiper trip upon any drag.');

    return {
      id: `alert-${wellName}-${primaryType.toLowerCase()}-${currentDepth}`,
      well_name: wellName,
      risk_type: mappedRiskType,
      current_depth: currentDepth,
      risk_interval: `${startDepth.toFixed(0)}m – ${endDepth.toFixed(0)}m`,
      formation: primaryEvent.formation_name || formation,
      severity: severity,
      message: `${wellName} is approaching a historical hazard interval (${startDepth.toFixed(0)}m–${endDepth.toFixed(0)}m MD) with recorded ${primaryType.replace('_', ' ')} in nearby offset wells (${affectedWells.join(', ')}).`,
      historical_wells: affectedWells,
      historical_events: uniqueSummaries,
      evidence: `${affectedWells.length} nearby offset well${affectedWells.length > 1 ? 's' : ''} encountered ${primaryType.replace('_', ' ')} in this depth interval (${matchingEvents.map(e => `${e.well_name} @ ${e.depth}m`).join(', ')}).`,
      recommendation: recommendation,
      source_doc: sourceDoc,
      active: true
    };
  }

  // Fallback compatibility
  if (currentDepth >= 3810 && currentDepth <= 3870) {
    return {
      id: `alert-risk-f3-${currentDepth}`,
      well_name: wellName,
      risk_type: 'MUD_LOSS',
      current_depth: currentDepth,
      risk_interval: '3810m – 3870m',
      formation: formation,
      severity: 'HIGH',
      message: `${wellName} is entering a historical high-risk interval associated with mud losses and torque spikes in comparable offset wells.`,
      historical_wells: ['X12', 'X09', 'X21', 'X07'],
      historical_events: ['Mud Loss (3818m, 3837m, 3845m)', 'Torque Spike (3862m)', 'Stuck Pipe (3858m)'],
      evidence: '4 nearby offset wells encountered major fluid loss and stick-slip in this exact formation window.',
      recommendation: 'Review the mitigation approach used in comparable offset wells. Prepare LCM pills on surface, reduce ECD below 1.08 sg, and limit connection standstill times to <10 minutes.',
      source_doc: 'DDR_X12_3845.pdf (Page 4)',
      active: true
    };
  }

  if (currentDepth > 3870 && currentDepth <= 3900) {
    return {
      id: `alert-stuck-pipe-${currentDepth}`,
      well_name: wellName,
      risk_type: 'STUCK_PIPE',
      current_depth: currentDepth,
      risk_interval: '3870m – 3910m',
      formation: formation,
      severity: 'CRITICAL',
      message: `Approaching critical differential sticking zone. Offset well X12 suffered 42 hrs NPT at 3890m.`,
      historical_wells: ['X12'],
      historical_events: ['Stuck Pipe (3890m)'],
      evidence: 'Offset well X12 became stuck during connection in high-pressure regime.',
      recommendation: 'Continuous string rotation required. Maximum 10-minute connections. Ready spotting fluid at rigsite.',
      source_doc: 'DDR_X12_3890.pdf (Page 12)',
      active: true
    };
  }

  return null;
}

// Grounded NWIS Copilot Q&A Engine
export function answerCopilotQuestion(
  question: string,
  context: {
    currentDepth: number;
    activeWell: Well;
    nearbyWells: Well[];
    events: OperationalEvent[];
  }
): { answer: string; evidence: string; source: string; confidence: number } {
  const q = question.toLowerCase();
  const activeName = context.activeWell?.well_name || 'X17';
  const activeFm = context.activeWell?.formation_name || 'F3';
  const currentDepth = context.currentDepth;

  // Find candidate offsets (excluding the active well itself)
  const candidateOffsets = (context.nearbyWells || []).filter(w => w.well_name !== activeName);
  candidateOffsets.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
  const mostRelevant = candidateOffsets[0];

  if (/comparable|most relevant|similar well|best offset/.test(q)) {
    if (mostRelevant) {
      return {
        answer: `Well ${mostRelevant.well_name} is the most comparable offset well to ${activeName} with a ${mostRelevant.relevance_score || 88}% Offset Relevance score. It is located ${mostRelevant.distance_km?.toFixed(1) || '—'} km away, targeted ${mostRelevant.formation_name || activeFm} (${mostRelevant.reservoir_name || 'Shared Reservoir'}), and reached ${mostRelevant.total_depth}m TD.`,
        evidence: `Distance: ${mostRelevant.distance_km?.toFixed(1) || '—'} km | Formation: ${mostRelevant.formation_name || activeFm} | Relevance: ${mostRelevant.relevance_score}%`,
        source: `WCR_${mostRelevant.well_name}.pdf & Offset Relevance Model`,
        confidence: 0.95
      };
    }
    return {
      answer: `No nearby offset wells are found within the current search radius of ${activeName}. Consider increasing the offset radius.`,
      evidence: `Search radius evaluated around ${activeName} (${context.activeWell.latitude}, ${context.activeWell.longitude}).`,
      source: 'NWIS Geospatial Offset Engine',
      confidence: 0.90
    };
  }

  if (/3850|3845|around 3850|near 3850|3842/.test(q)) {
    return {
      answer: `Around 3845m–3865m, nearby offset well X12 experienced high-severity mud loss (~25 bbl/hr) at 3845m in Formation F3. Additionally, X21 experienced Stuck Pipe at 3858m and X12 suffered an elevated Torque Spike (34 kNm) at 3862m.`,
      evidence: `Historical events recorded in X12, X21, and X09 across the 3840m–3865m interval near active well ${activeName}.`,
      source: 'DDR_X12_3845.pdf (Page 4), DDR_X21_3858.pdf',
      confidence: 0.94
    };
  }

  if (/x12.*3845|what happened in x12/.test(q)) {
    return {
      answer: 'In offset well X12 at 3845m (Formation F3), significant partial-to-total mud loss (~25 bbl/hr) occurred due to a natural fracture network encountered at the F3 transition. Returns were completely lost after 2 hours.',
      evidence: 'Historical Mitigation: Pumped 50-bbl coarse/medium LCM pill, lowered flow rate to 1400 lpm (reducing downhole ECD to 1.08 sg), followed by a 30-bbl graphite/calcium carbonate pill to restore 100% returns.',
      source: 'DDR_X12_3845.pdf (Page 4, Section 6)',
      confidence: 0.96
    };
  }

  if (/mitigation.*mud loss|loss mitigation|how.*mud loss/.test(q)) {
    return {
      answer: `The primary proven historical mitigation for mud loss in ${activeFm} is pumping a 50-bbl bridging LCM pill (mixed coarse & medium particles) while simultaneously lowering the mud flow rate to reduce downhole ECD to 1.08 sg. In offset X12, full returns were restored after a secondary spot-squeeze with calcium carbonate.`,
      evidence: 'Applied successfully on X12 at 3845m and on X09 at 3818m.',
      source: 'DDR_X12_3845.pdf, Lessons Learned Register #LL-2022-88',
      confidence: 0.93
    };
  }

  if (/stuck pipe|which wells.*stuck pipe/.test(q)) {
    return {
      answer: `Two nearby offset wells suffered stuck pipe in ${activeFm}: X21 became stuck at 3858m during tripping, and X12 suffered critical differential sticking at 3890m during a pipe connection, resulting in 42 hours of NPT before being freed with jarring and spotting fluid.`,
      evidence: 'X21 (3858m, High severity), X12 (3890m, Critical severity, 42 hrs NPT).',
      source: 'DDR_X12_3890.pdf (Page 12), DDR_X21_3858.pdf',
      confidence: 0.95
    };
  }

  if (/risk.*approaching|what risks|approaching current depth/.test(q)) {
    const approachingWindowEvents = (context.events || []).filter(e =>
      e.well_name !== activeName &&
      e.depth >= currentDepth - 10 &&
      e.depth <= currentDepth + 150
    );

    if (approachingWindowEvents.length > 0) {
      const types = [...new Set(approachingWindowEvents.map(e => e.event_type.replace('_', ' ')))];
      const wells = [...new Set(approachingWindowEvents.map(e => e.well_name))];
      return {
        answer: `For active well ${activeName} at ${currentDepth}m MD, the approaching look-ahead interval (${currentDepth}m–${currentDepth + 150}m in ${activeFm}) contains ${approachingWindowEvents.length} recorded historical incidents: ${types.join(', ')} recorded across offset wells ${wells.join(', ')}.`,
        evidence: approachingWindowEvents.map(e => `${e.well_name} @ ${e.depth}m (${e.event_type})`).join('; '),
        source: 'NWIS Dynamic Look-Ahead Engine',
        confidence: 0.92
      };
    }

    return {
      answer: `For active well ${activeName} at ${currentDepth}m MD, no critical historical offset incidents are recorded within the next 150m look-ahead window in ${activeFm}. Continue standard drilling parameters.`,
      evidence: `Query window ${currentDepth}m–${currentDepth + 150}m evaluated across all nearby offsets of ${activeName}.`,
      source: 'NWIS Dynamic Look-Ahead Engine',
      confidence: 0.90
    };
  }

  // Fallback for general questions
  return {
    answer: `Connected to Active Well ${activeName} at ${currentDepth}m MD in Formation ${activeFm}. Grounded on ${context.nearbyWells.length} nearby offset wells and ${context.events.length} historical operational events. You can ask about offset hazards, mud loss mitigations, stuck pipe incidents, or most comparable offset wells.`,
    evidence: `Context: Active Well ${activeName} (${context.activeWell.latitude}°N, ${context.activeWell.longitude}°E), Current Depth ${currentDepth}m MD.`,
    source: 'NWIS Grounded Intelligence Core',
    confidence: 0.88
  };
}
