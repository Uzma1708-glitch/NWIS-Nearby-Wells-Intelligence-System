import React, { useState, useMemo } from 'react';
import { Layers, Activity, Database, AlertTriangle } from 'lucide-react';
import type { Well, Formation, OperationalEvent, DrillingParameterPoint } from '../types/sihDomain';

export type ParamField = 'torque_knm' | 'rop_m_hr' | 'wob_klbs' | 'ecd_sg';

const getParamValue = (p: DrillingParameterPoint, field: ParamField): number => {
  const val = p[field];
  return typeof val === 'number' ? val : 0;
};

interface CrossWellCorrelationProps {
  activeWell?: Well;
  currentDepth: number;
  wells: Well[];
  formations: Formation[];
  events: OperationalEvent[];
  drillingParameters: DrillingParameterPoint[];
  onSelectWell?: (well: Well) => void;
  onSelectEvent?: (event: OperationalEvent) => void;
}

export const CrossWellCorrelation: React.FC<CrossWellCorrelationProps> = ({
  activeWell,
  currentDepth,
  wells,
  formations,
  events,
  drillingParameters,
  onSelectWell,
  onSelectEvent
}) => {
  const activeName = activeWell?.well_name ?? 'X17';
  const [activeSubTab, setActiveSubTab] = useState<'stratigraphy' | 'parameters' | 'geology'>('parameters');
  const [selectedWellNames, setSelectedWellNames] = useState<string[]>([
    activeName,
    'X12',
    'X09',
    'X21',
    'X07',
    'X15'
  ]);
  const [paramField, setParamField] = useState<ParamField>('torque_knm');

  const correlatedWells = useMemo(() => {
    // Keep active well first, followed by others in order of proximity
    const list = wells.filter(w => selectedWellNames.includes(w.well_name) || w.well_name === activeName);
    return list.sort((a, b) => {
      if (a.well_name === activeName) return -1;
      if (b.well_name === activeName) return 1;
      return (a.distance_km ?? 0) - (b.distance_km ?? 0);
    });
  }, [wells, selectedWellNames, activeName]);

  const toggleWell = (name: string) => {
    if (name === activeName) return; // Active well is locked as reference track
    setSelectedWellNames((prev: string[]) =>
      prev.includes(name) ? prev.filter((n: string) => n !== name) : [...prev, name]
    );
  };

  // Depth range for stratigraphic visualizer (3000m to 4200m)
  const stratMinDepth = 3000;
  const stratMaxDepth = 4200;
  const stratDepthSpan = stratMaxDepth - stratMinDepth;
  const depthToPercent = (d: number) =>
    Math.max(0, Math.min(100, ((d - stratMinDepth) / stratDepthSpan) * 100));

  // Depth range for Drilling Parameter tracks (Demonstration Interval: 3750m to 3950m)
  const paramMinDepth = 3750;
  const paramMaxDepth = 3950;
  const paramDepthSpan = paramMaxDepth - paramMinDepth;

  // Parameter configuration scales
  const paramConfigs: Record<
    ParamField,
    { label: string; unit: string; min: number; max: number; criticalThreshold: number }
  > = {
    torque_knm: { label: 'Torque', unit: 'kNm', min: 0, max: 40, criticalThreshold: 28 },
    rop_m_hr: { label: 'ROP', unit: 'm/h', min: 0, max: 35, criticalThreshold: 8 },
    wob_klbs: { label: 'WOB', unit: 'klbs', min: 0, max: 35, criticalThreshold: 28 },
    ecd_sg: { label: 'ECD', unit: 'sg', min: 0.95, max: 1.25, criticalThreshold: 1.05 }
  };
  const activeCfg = paramConfigs[paramField];

  // Map depth to Y coordinate (0 to 380px)
  const depthToParamY = (d: number) =>
    Math.max(0, Math.min(380, ((d - paramMinDepth) / paramDepthSpan) * 380));

  // Map parameter value to X coordinate (0 to 140px)
  const valToParamX = (val: number) => {
    const clamped = Math.max(activeCfg.min, Math.min(activeCfg.max, val));
    return ((clamped - activeCfg.min) / (activeCfg.max - activeCfg.min)) * 140;
  };

  // Risk zone bounds
  const riskTop = 3810;
  const riskBottom = 3870;

  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-y-auto">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden bg-card">
            <button
              onClick={() => setActiveSubTab('parameters')}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeSubTab === 'parameters'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Parameter Correlation Tracks
            </button>
            <button
              onClick={() => setActiveSubTab('stratigraphy')}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeSubTab === 'stratigraphy'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Well Stratigraphy & Events
            </button>
            <button
              onClick={() => setActiveSubTab('geology')}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeSubTab === 'geology'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> Geological & Reservoir
            </button>
          </div>
        </div>

        {/* Well Selector Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground mr-1">Correlated Wells:</span>
          {wells.slice(0, 8).map(w => {
            const name = w.well_name;
            const isSelected = selectedWellNames.includes(name) || name === activeName;
            const isCurrentActive = name === activeName;
            return (
              <button
                key={name}
                onClick={() => toggleWell(name)}
                className={`text-xs px-2.5 py-1 rounded font-bold border cursor-pointer transition-all ${
                  isCurrentActive
                    ? 'bg-critical/20 text-critical border-critical/50 shadow-sm'
                    : isSelected
                    ? 'bg-primary/15 text-primary border-primary/50 shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:bg-secondary opacity-60'
                }`}
              >
                {name} {isCurrentActive && '(Active Target)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PARAMETER CORRELATION TAB (Side-by-side well log tracks) */}
      {/* ========================================================================= */}
      {activeSubTab === 'parameters' && (
        <div className="panel p-4 flex-1 flex flex-col gap-3 min-h-[620px] overflow-hidden">
          {/* Header with Parameter Switchers and Corridor Annotations */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                Depth Log Tracks · 3750m – 3950m
              </span>
              <span className="text-[10px] bg-amber/15 text-amber border border-amber/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> F3 Hazard Corridor (3810–3870m)
              </span>
              <span className="text-[10px] bg-critical/15 text-critical border border-critical/30 px-2 py-0.5 rounded font-mono-nums font-bold">
                {activeName} Bit Depth: {currentDepth}m MD
              </span>
            </div>

            {/* Parameter Field Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Parameter:</span>
              {[
                { id: 'torque_knm' as const, label: 'Torque (kNm)' },
                { id: 'rop_m_hr' as const, label: 'ROP (m/h)' },
                { id: 'wob_klbs' as const, label: 'WOB (klbs)' },
                { id: 'ecd_sg' as const, label: 'ECD (sg)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setParamField(opt.id)}
                  className={`text-xs px-3 py-1 rounded font-bold border cursor-pointer transition-colors ${
                    paramField === opt.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card border-border hover:bg-secondary text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Synchronized Multi-Track Corridor Container */}
          <div className="flex-1 flex overflow-x-auto border border-border rounded-lg bg-card/40 relative min-w-[820px]">
            {/* 1. Shared Left Depth Scale Column */}
            <div className="w-16 border-r border-border bg-card/80 shrink-0 relative flex flex-col justify-between py-1 px-1 select-none">
              <div className="text-[9px] font-bold text-muted-foreground uppercase text-center pb-2 border-b border-border">
                Depth (MD)
              </div>
              <div className="relative flex-1">
                {[3750, 3775, 3800, 3825, 3842, 3850, 3875, 3900, 3925, 3950].map(d => {
                  const y = depthToParamY(d);
                  const isBitDepth = d === currentDepth;
                  return (
                    <div
                      key={d}
                      className="absolute left-0 right-0 flex items-center justify-end pr-1.5"
                      style={{ top: `${(y / 380) * 100}%` }}
                    >
                      <span
                        className={`font-mono-nums text-[9.5px] ${
                          isBitDepth
                            ? 'text-critical font-extrabold bg-critical/20 px-1 rounded'
                            : d >= 3810 && d <= 3870
                            ? 'text-amber font-semibold'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {d}m
                      </span>
                      <div className={`w-1.5 h-px ml-1 ${isBitDepth ? 'bg-critical' : 'bg-border'}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Side-by-side Well Track Columns */}
            <div className="flex-1 flex divide-x divide-border">
              {correlatedWells.map((w: Well) => {
                const isThisActive = w.well_name === activeName;
                const wellPts = drillingParameters.filter(p => p.well_name === w.well_name);
                const wellEvents = events.filter(e => e.well_name === w.well_name);

                // Value readout at current bit depth
                const ptAtDepth =
                  wellPts.find(p => Math.abs(p.depth - currentDepth) <= 5) ||
                  wellPts[wellPts.length - 1];
                const currentVal = ptAtDepth ? getParamValue(ptAtDepth, paramField).toFixed(1) : '--';

                // Find peak value in this track
                const maxInTrack = wellPts.length
                  ? Math.max(...wellPts.map(p => getParamValue(p, paramField)))
                  : 0;

                // Build SVG path points
                const svgPoints = wellPts.map(p => {
                  const y = depthToParamY(p.depth);
                  const x = valToParamX(getParamValue(p, paramField));
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });

                const polylineStr = svgPoints.join(' ');
                // Closed polygon for shaded area under curve
                const firstY = wellPts.length ? depthToParamY(wellPts[0].depth) : 0;
                const lastY = wellPts.length
                  ? depthToParamY(wellPts[wellPts.length - 1].depth)
                  : 380;
                const polygonStr = `0,${firstY} ${polylineStr} 0,${lastY}`;

                return (
                  <div
                    key={w.well_name}
                    className={`flex-1 min-w-[130px] flex flex-col p-2 select-none ${
                      isThisActive ? 'bg-critical/5 ring-1 ring-critical/20' : 'bg-transparent'
                    }`}
                  >
                    {/* WELL HEADER (BOLD, CLEAR, NEVER CLIPPED) */}
                    <div
                      onClick={() => onSelectWell && onSelectWell(w)}
                      className={`p-2 rounded-md border cursor-pointer transition-all mb-2 ${
                        isThisActive
                          ? 'bg-critical/15 border-critical/50 text-foreground ring-1 ring-critical/30'
                          : 'bg-card border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-foreground tracking-wide">
                          {w.well_name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isThisActive
                              ? 'bg-critical text-white'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {isThisActive ? 'ACTIVE TARGET' : `${w.distance_km} km`}
                        </span>
                      </div>

                      {/* Current Value Readout Badge */}
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span className="text-muted-foreground">{activeCfg.label}:</span>
                        <span
                          className={`font-mono-nums font-bold ${
                            Number(currentVal) >= activeCfg.criticalThreshold
                              ? 'text-critical'
                              : 'text-primary'
                          }`}
                        >
                          {currentVal} {activeCfg.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                        <span>Peak:</span>
                        <span className="font-mono-nums font-semibold text-foreground/80">
                          {maxInTrack.toFixed(1)} {activeCfg.unit}
                        </span>
                      </div>
                    </div>

                    {/* Scale indicator at top of track */}
                    <div className="flex items-center justify-between text-[8px] font-mono-nums text-muted-foreground px-1 pb-1 border-b border-border/50">
                      <span>{activeCfg.min}</span>
                      <span className="font-semibold text-foreground/80">
                        {activeCfg.unit}
                      </span>
                      <span>{activeCfg.max}</span>
                    </div>

                    {/* TRACK PLOT AREA */}
                    <div className="flex-1 relative w-full border border-border/40 rounded bg-background/60 overflow-hidden min-h-[380px]">
                      {/* 1. Shaded Risk Corridor Band (3810 - 3870m) */}
                      <div
                        className="absolute left-0 right-0 bg-amber/10 border-y border-dashed border-amber/40 pointer-events-none z-0"
                        style={{
                          top: `${(depthToParamY(riskTop) / 380) * 100}%`,
                          height: `${((depthToParamY(riskBottom) - depthToParamY(riskTop)) / 380) * 100}%`
                        }}
                      />

                      {/* 2. Active Bit Depth Line across this track */}
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-critical z-10 pointer-events-none"
                        style={{ top: `${(depthToParamY(currentDepth) / 380) * 100}%` }}
                      >
                        {isThisActive && (
                          <div className="absolute right-1 -top-3 text-[8px] font-bold bg-critical text-white px-1 rounded shadow-sm">
                            BIT {currentDepth}m MD
                          </div>
                        )}
                      </div>

                      {/* 3. SVG Grid & Parameter Curve */}
                      <svg
                        viewBox="0 0 140 380"
                        preserveAspectRatio="none"
                        className="w-full h-full relative z-5"
                      >
                        {/* Vertical grid lines (25%, 50%, 75%) */}
                        <line x1="35" y1="0" x2="35" y2="380" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 3" opacity={0.4} />
                        <line x1="70" y1="0" x2="70" y2="380" stroke="hsl(var(--border))" strokeWidth="0.6" strokeDasharray="2 2" opacity={0.6} />
                        <line x1="105" y1="0" x2="105" y2="380" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2 3" opacity={0.4} />

                        {/* Horizontal depth grid lines */}
                        {[3800, 3850, 3900].map(d => (
                          <line
                            key={d}
                            x1="0"
                            y1={depthToParamY(d)}
                            x2="140"
                            y2={depthToParamY(d)}
                            stroke="hsl(var(--border))"
                            strokeWidth="0.5"
                            strokeDasharray="2 2"
                            opacity={0.5}
                          />
                        ))}

                        {/* Shaded Area under Curve */}
                        {wellPts.length > 1 && (
                          <polygon
                            points={polygonStr}
                            fill={isThisActive ? 'hsl(var(--critical))' : 'hsl(var(--primary))'}
                            opacity={0.15}
                          />
                        )}

                        {/* Continuous Polyline Track */}
                        {wellPts.length > 1 && (
                          <polyline
                            fill="none"
                            stroke={isThisActive ? '#ef4444' : '#0ea5e9'}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={polylineStr}
                          />
                        )}

                        {/* Active Well Drill Bit End Point */}
                        {isThisActive && wellPts.length > 0 && (
                          <circle
                            cx={valToParamX(getParamValue(wellPts[wellPts.length - 1], paramField))}
                            cy={depthToParamY(currentDepth)}
                            r="4"
                            fill="#dc2626"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        )}
                      </svg>

                      {/* 4. Historical Event Pin Badges on Curve */}
                      {wellEvents.map(e => {
                        const y = depthToParamY(e.depth);
                        if (y < 0 || y > 380) return null;

                        const isSevere = e.severity === 'HIGH' || e.severity === 'CRITICAL';
                        const badgeColor = e.event_type.includes('LOSS')
                          ? '#f59e0b'
                          : e.event_type.includes('STUCK')
                          ? '#06b6d4'
                          : '#a855f7';

                        return (
                          <div
                            key={e.id}
                            onClick={() => onSelectEvent && onSelectEvent(e)}
                            className="absolute -translate-y-1/2 right-1 z-20 flex items-center group cursor-pointer"
                            style={{ top: `${(y / 380) * 100}%` }}
                            title={`${e.event_type.replace('_', ' ')} @ ${e.depth}m`}
                          >
                            <div
                              className="px-1.5 py-0.5 rounded shadow-md text-[8.5px] font-bold text-white flex items-center gap-1 border border-white/40 transition-transform group-hover:scale-110"
                              style={{ backgroundColor: isSevere ? '#ef4444' : badgeColor }}
                            >
                              <span>{e.depth}m</span>
                              <span>{e.event_type.replace('_', ' ').slice(0, 4)}</span>
                            </div>

                            {/* Hover info popover */}
                            <div className="hidden group-hover:flex absolute right-full mr-2 z-40 bg-card border border-border p-2 rounded shadow-xl text-xs w-48 flex-col pointer-events-none">
                              <span className="font-bold text-primary">
                                {e.event_type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-mono-nums">
                                {w.well_name} · Depth: {e.depth}m
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-1">
                                {e.cause || e.lessons_learned}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STRATIGRAPHY & EVENT CORRELATION TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'stratigraphy' && (
        <div className="panel p-4 flex-1 flex flex-col min-h-[580px] overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="label-tag text-muted-foreground">Depth Aligned Correlation Track</span>
              <span className="tag-proto">SIH PS 26121 LOCKED SCENARIO</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-critical inline-block" /> Active Depth ({currentDepth}m)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 bg-amber/20 border border-amber/50 inline-block" /> Historical Risk Interval (3810–3870m)
              </span>
            </div>
          </div>

          {/* Correlation Columns Visualizer */}
          <div className="relative flex-1 border border-border rounded-lg bg-secondary/15 flex overflow-x-auto min-w-[700px]">
            {/* Depth Scale Column */}
            <div className="w-16 border-r border-border bg-card/60 shrink-0 relative flex flex-col justify-between py-2 px-1 text-[10px] font-mono-nums text-muted-foreground">
              {[3000, 3200, 3400, 3600, 3800, 3810, 3842, 3870, 4000, 4200].map(d => (
                <div
                  key={d}
                  className="absolute left-0 right-0 flex items-center justify-end pr-2"
                  style={{ top: `${depthToPercent(d)}%` }}
                >
                  <span className={d === currentDepth ? 'text-critical font-bold' : ''}>{d}m</span>
                  <div className="w-1 h-px bg-border ml-1" />
                </div>
              ))}
            </div>

            {/* Background Risk Zone Overlay */}
            <div
              className="absolute left-16 right-0 bg-amber/10 border-y border-dashed border-amber/40 pointer-events-none z-0"
              style={{
                top: `${depthToPercent(riskTop)}%`,
                height: `${depthToPercent(riskBottom) - depthToPercent(riskTop)}%`
              }}
            >
              <span className="absolute right-3 top-1 text-[10px] font-bold text-amber tracking-wider uppercase">
                Historical Risk Interval (3810–3870m in F3)
              </span>
            </div>

            {/* Active Well Current Depth Line */}
            <div
              className="absolute left-0 right-0 border-t-2 border-critical z-20 pointer-events-none flex items-center"
              style={{ top: `${depthToPercent(currentDepth)}%` }}
            >
              <div className="bg-critical text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                {activeName} BIT DEPTH: {currentDepth}m MD
              </div>
            </div>

            {/* Individual Well Columns */}
            <div className="flex-1 grid grid-flow-col auto-cols-fr relative z-10 divide-x divide-border">
              {correlatedWells.map((w: Well) => {
                const isThisActive = w.well_name === activeName;
                const wellEvents = events.filter(e => e.well_name === w.well_name);

                return (
                  <div key={w.well_name} className="relative flex flex-col h-full px-2 pt-2">
                    {/* Well Column Header */}
                    <div
                      onClick={() => onSelectWell && onSelectWell(w)}
                      className={`panel-inset p-2 text-center cursor-pointer transition-colors ${
                        isThisActive ? 'bg-critical/15 border-critical/40 ring-1 ring-critical/30' : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="font-bold text-xs">{w.well_name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {isThisActive ? 'Active Target' : `${w.distance_km} km`} · TD: {w.total_depth}m MD
                      </div>
                    </div>

                    {/* Well Track Line */}
                    <div className="relative flex-1 w-full flex justify-center">
                      <div className={`w-1.5 h-full rounded-full ${isThisActive ? 'bg-critical/40' : 'bg-steel/30'}`} />

                      {/* Event Markers on Well Track */}
                      {wellEvents.map(e => {
                        const topPct = depthToPercent(e.depth);
                        const isSevere = e.severity === 'HIGH' || e.severity === 'CRITICAL';
                        return (
                          <div
                            key={e.id}
                            onClick={() => onSelectEvent && onSelectEvent(e)}
                            className="absolute -translate-x-1/2 flex items-center group cursor-pointer"
                            style={{ top: `${topPct}%`, left: '50%' }}
                            title={`${e.event_type} @ ${e.depth}m`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 grid place-items-center shadow-md transition-transform group-hover:scale-125 ${
                              isSevere ? 'bg-critical border-white text-white' : 'bg-amber border-white text-white'
                            }`}>
                              <span className="text-[8px] font-bold">!</span>
                            </div>

                            {/* Event Label Flag */}
                            <div className="hidden group-hover:flex absolute left-5 z-30 bg-card border border-border p-2 rounded shadow-xl text-xs w-52 flex-col">
                              <span className="font-bold text-primary">{e.event_type.replace('_', ' ')}</span>
                              <span className="text-[10px] font-mono-nums">{e.depth}m · {w.well_name}</span>
                              <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{e.cause}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GEOLOGICAL & RESERVOIR CORRELATION TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'geology' && (
        <div className="panel p-4 flex-1 space-y-4">
          <div className="label-tag text-muted-foreground">Geological Formations & Event Concentration</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {formations.map(f => {
              const formEvents = events.filter(e => e.formation_id === f.id);
              const isF3 = f.name === 'F3';
              return (
                <div
                  key={f.id}
                  className={`panel-inset p-4 rounded-lg border-2 ${
                    isF3 ? 'border-amber/60 bg-amber/5 ring-1 ring-amber/30' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{f.name}</span>
                    <span className="text-[10px] font-mono-nums text-muted-foreground">
                      {f.top_depth}–{f.base_depth}m
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{f.description}</p>
                  <div className="text-xs font-semibold mb-1">Lithology: {f.lithology}</div>

                  <div className="pt-2 border-t border-border mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Recorded Events</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        formEvents.length > 4 ? 'bg-critical/15 text-critical' : 'bg-secondary text-foreground'
                      }`}
                    >
                      {formEvents.length} Events {isF3 && '(Critical Hazard Zone)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
