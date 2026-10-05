import React, { useState } from 'react';
import { X, Layers, AlertTriangle, FileText, CheckCircle, Compass, Sliders, Star } from 'lucide-react';
import { useNwis } from '../context/NwisContext';
import type {
  Well,
  OperationalEvent,
  TrajectoryPoint,
  DrillingParameterPoint,
  CasingProgram,
  CementingRecord,
  MudProgram,
  DocumentItem
} from '../types/sihDomain';

interface WellIntelligenceDrawerProps {
  well: Well | null;
  events: OperationalEvent[];
  trajectories: TrajectoryPoint[];
  drillingParameters: DrillingParameterPoint[];
  casingPrograms: CasingProgram[];
  cementingRecords: CementingRecord[];
  mudPrograms: MudProgram[];
  documents: DocumentItem[];
  onClose: () => void;
  onSelectEvent?: (event: OperationalEvent) => void;
}

export const WellIntelligenceDrawer: React.FC<WellIntelligenceDrawerProps> = ({
  well,
  events,
  trajectories,
  drillingParameters,
  casingPrograms,
  cementingRecords,
  mudPrograms,
  documents,
  onClose,
  onSelectEvent
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'programs' | 'telemetry' | 'docs'>('overview');
  const { activeWell, setActiveWell } = useNwis();

  if (!well) return null;

  const isCurrentActive = activeWell.well_name === well.well_name;

  const wellEvents = events.filter(e => e.well_name === well.well_name);
  const wellTrajectories = trajectories.filter(t => t.well_name === well.well_name);
  const wellParams = drillingParameters.filter(p => p.well_name === well.well_name);
  const wellCasing = casingPrograms.filter(c => c.well_name === well.well_name);
  const wellCementing = cementingRecords.filter(c => c.well_name === well.well_name);
  const wellMud = mudPrograms.filter(m => m.well_name === well.well_name);
  const wellDocs = documents.filter(d => d.well_name === well.well_name);

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-card border-l border-border shadow-2xl flex flex-col animate-slide-up z-10">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary/10 border border-primary/30 text-primary grid place-items-center font-bold text-sm">
              {well.well_name}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{well.well_name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                  well.status === 'ACTIVE'
                    ? 'bg-critical/10 text-critical border-critical/30'
                    : 'bg-teal/10 text-teal border-teal/30'
                }`}>
                  {well.status}
                </span>
                {well.distance_km != null && well.distance_km > 0 && (
                  <span className="tag-nlog text-[10px]">
                    {well.distance_km.toFixed(1)} km offset
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {well.operator} · {well.field} · TD: {well.total_depth}m
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveWell(well.well_name)}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isCurrentActive
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-xs'
              }`}
              title={isCurrentActive ? 'Currently the target active well' : 'Set as target active well for downstream calculations'}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{isCurrentActive ? 'Active Target' : 'Set as Target'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-border bg-secondary/30 px-3 overflow-x-auto">
          {[
            { id: 'overview' as const, label: 'Overview & Relevance', icon: Compass },
            { id: 'events' as const, label: `Historical Events (${wellEvents.length})`, icon: AlertTriangle },
            { id: 'programs' as const, label: 'Casing / Mud / Cement', icon: Layers },
            { id: 'telemetry' as const, label: 'Parameters & Trajectory', icon: Sliders },
            { id: 'docs' as const, label: `Documents (${wellDocs.length})`, icon: FileText }
          ].map(t => {
            const Icon = t.icon;
            const isTabActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
                  isTabActive
                    ? 'border-primary text-primary bg-card/60'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. OVERVIEW & RELEVANCE TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Explainable Relevance Card */}
              {well.relevance_score != null && (
                <div className="panel p-4 border-l-4 border-l-primary">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-tag text-muted-foreground">PROTOTYPE OFFSET RELEVANCE</span>
                    <span className="text-xl font-bold font-mono-nums text-primary">
                      {well.relevance_score}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden mb-3">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${well.relevance_score}%` }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-foreground">Explainability Factors:</div>
                    {well.relevance_reasons?.map((r, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Well Specs */}
              <div className="panel p-4">
                <div className="label-tag text-muted-foreground mb-3">Well Specifications</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="panel-inset p-2.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Target Formation</span>
                    <span className="font-semibold text-sm">{well.formation_name || 'F3'}</span>
                  </div>
                  <div className="panel-inset p-2.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Target Reservoir</span>
                    <span className="font-semibold text-sm">{well.reservoir_name || 'R-Beta'}</span>
                  </div>
                  <div className="panel-inset p-2.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Total Depth (TD)</span>
                    <span className="font-mono-nums font-semibold text-sm">{well.total_depth} m</span>
                  </div>
                  <div className="panel-inset p-2.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Current Depth</span>
                    <span className="font-mono-nums font-semibold text-sm">{well.current_depth} m</span>
                  </div>
                  <div className="panel-inset p-2.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Coordinates</span>
                    <span className="font-mono-nums text-xs">{well.latitude.toFixed(4)}°N, {well.longitude.toFixed(4)}°E</span>
                  </div>
                  <div className="panel-inset p-2.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Spud / Completion</span>
                    <span className="text-xs">{well.spud_date} → {well.completion_date || 'In progress'}</span>
                  </div>
                </div>

                {well.notes && (
                  <div className="mt-3 panel-inset p-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Operational Notes: </span>
                    {well.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. HISTORICAL EVENTS TAB */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              {wellEvents.length === 0 ? (
                <div className="panel p-8 text-center text-sm text-muted-foreground">
                  No historical operational events recorded on well {well.well_name}.
                </div>
              ) : (
                wellEvents.map(e => (
                  <div key={e.id} className="panel p-4 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{e.event_type.replace('_', ' ')}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          e.severity === 'CRITICAL' || e.severity === 'HIGH'
                            ? 'bg-critical/10 text-critical border-critical/30'
                            : 'bg-amber/10 text-amber border-amber/30'
                        }`}>
                          {e.severity}
                        </span>
                      </div>
                      <span className="font-mono-nums text-xs font-bold text-primary">
                        {e.depth} m ({e.formation_name || 'F3'})
                      </span>
                    </div>

                    <p className="text-xs text-foreground/90 leading-relaxed mb-2">{e.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                      <div className="panel-inset p-2">
                        <span className="text-muted-foreground block text-[10px]">Root Cause</span>
                        <span>{e.cause}</span>
                      </div>
                      <div className="panel-inset p-2">
                        <span className="text-muted-foreground block text-[10px]">Outcome & NPT</span>
                        <span>{e.outcome} ({e.npt_hours}h NPT)</span>
                      </div>
                    </div>

                    {e.mitigations && e.mitigations.length > 0 && (
                      <div className="panel-inset p-2.5 mb-2 bg-secondary/50">
                        <div className="label-tag text-muted-foreground mb-1">Historical Mitigations Applied</div>
                        <div className="space-y-1">
                          {e.mitigations.map((m, idx) => (
                            <div key={idx} className="text-xs flex items-start gap-1.5">
                              <span className={`text-[10px] font-bold px-1 rounded ${
                                m.success_indicator === 'SUCCESS' ? 'bg-teal/20 text-teal' : 'bg-amber/20 text-amber'
                              }`}>
                                {m.success_indicator}
                              </span>
                              <span>{m.mitigation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
                      <span>Source: <strong className="text-foreground">{e.source_doc}</strong> (p. {e.source_page})</span>
                      {onSelectEvent && (
                        <button
                          onClick={() => onSelectEvent(e)}
                          className="text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Trace Evidence →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. TECHNICAL PROGRAMS TAB */}
          {activeTab === 'programs' && (
            <div className="space-y-4">
              {/* Casing Program */}
              <div className="panel p-4">
                <div className="label-tag text-muted-foreground mb-2">Casing Program</div>
                {wellCasing.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Standard casing program applied.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground text-left border-b border-border">
                          <th className="pb-1 font-semibold">Casing Type</th>
                          <th className="pb-1 font-semibold">Hole</th>
                          <th className="pb-1 font-semibold">Casing</th>
                          <th className="pb-1 font-semibold">Shoe Depth</th>
                          <th className="pb-1 font-semibold">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {wellCasing.map(c => (
                          <tr key={c.id}>
                            <td className="py-1 font-semibold">{c.casing_type}</td>
                            <td className="py-1 font-mono-nums">{c.hole_size_in}&quot;</td>
                            <td className="py-1 font-mono-nums">{c.casing_size_in}&quot;</td>
                            <td className="py-1 font-mono-nums">{c.shoe_depth_m} m</td>
                            <td className="py-1">{c.grade} ({c.weight_ppf} ppf)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cementing Records */}
              <div className="panel p-4">
                <div className="label-tag text-muted-foreground mb-2">Cementing Records</div>
                {wellCementing.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Standard cementing records logged.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground text-left border-b border-border">
                          <th className="pb-1 font-semibold">Casing</th>
                          <th className="pb-1 font-semibold">Depth</th>
                          <th className="pb-1 font-semibold">Slurry</th>
                          <th className="pb-1 font-semibold">Density</th>
                          <th className="pb-1 font-semibold">TOC</th>
                          <th className="pb-1 font-semibold">Bond Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {wellCementing.map(c => (
                          <tr key={c.id}>
                            <td className="py-1 font-semibold">{c.casing_size_in}&quot;</td>
                            <td className="py-1 font-mono-nums">{c.depth_m} m</td>
                            <td className="py-1">{c.slurry_type}</td>
                            <td className="py-1 font-mono-nums">{c.slurry_density_sg} sg</td>
                            <td className="py-1 font-mono-nums">{c.toc_m} m</td>
                            <td className="py-1 font-semibold text-teal">{c.bond_quality}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Mud Program */}
              <div className="panel p-4">
                <div className="label-tag text-muted-foreground mb-2">Drilling Fluid & Mud Program</div>
                {wellMud.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Water-based mud system logged.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground text-left border-b border-border">
                          <th className="pb-1 font-semibold">Interval</th>
                          <th className="pb-1 font-semibold">Mud Type</th>
                          <th className="pb-1 font-semibold">Density</th>
                          <th className="pb-1 font-semibold">Viscosity</th>
                          <th className="pb-1 font-semibold">PV / YP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {wellMud.map(m => (
                          <tr key={m.id}>
                            <td className="py-1 font-mono-nums">{m.interval_top_m}–{m.interval_base_m} m</td>
                            <td className="py-1 font-semibold">{m.mud_type}</td>
                            <td className="py-1 font-mono-nums">{m.density_sg} sg</td>
                            <td className="py-1 font-mono-nums">{m.viscosity_sec} s</td>
                            <td className="py-1 font-mono-nums">{m.pv_cp} cp / {m.yp_lb_100ft2}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. TELEMETRY & TRAJECTORY TAB */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <div className="panel p-4">
                <div className="label-tag text-muted-foreground mb-2">Directional Trajectory Survey</div>
                {wellTrajectories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Vertical well trajectory recorded.</p>
                ) : (
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground text-left border-b border-border">
                          <th className="pb-1 font-semibold">MD (m)</th>
                          <th className="pb-1 font-semibold">TVD (m)</th>
                          <th className="pb-1 font-semibold">Inclination</th>
                          <th className="pb-1 font-semibold">Azimuth</th>
                          <th className="pb-1 font-semibold">DLS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {wellTrajectories.map(t => (
                          <tr key={t.id}>
                            <td className="py-1 font-mono-nums font-semibold">{t.measured_depth}</td>
                            <td className="py-1 font-mono-nums">{t.true_vertical_depth}</td>
                            <td className="py-1 font-mono-nums">{t.inclination_deg}°</td>
                            <td className="py-1 font-mono-nums">{t.azimuth_deg}°</td>
                            <td className="py-1 font-mono-nums">{t.dogleg_severity}°/30m</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="panel p-4">
                <div className="label-tag text-muted-foreground mb-2">Historical Drilling Parameters</div>
                {wellParams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Parameters archived in Daily Reports.</p>
                ) : (
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground text-left border-b border-border">
                          <th className="pb-1 font-semibold">Depth (m)</th>
                          <th className="pb-1 font-semibold">ROP (m/h)</th>
                          <th className="pb-1 font-semibold">WOB (klbs)</th>
                          <th className="pb-1 font-semibold">RPM</th>
                          <th className="pb-1 font-semibold">Torque</th>
                          <th className="pb-1 font-semibold">ECD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {wellParams.map(p => (
                          <tr key={p.id}>
                            <td className="py-1 font-mono-nums font-semibold">{p.depth}</td>
                            <td className="py-1 font-mono-nums">{p.rop_m_hr}</td>
                            <td className="py-1 font-mono-nums">{p.wob_klbs}</td>
                            <td className="py-1 font-mono-nums">{p.rpm}</td>
                            <td className="py-1 font-mono-nums">{p.torque_knm} kNm</td>
                            <td className="py-1 font-mono-nums">{p.ecd_sg} sg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. DOCUMENTS TAB */}
          {activeTab === 'docs' && (
            <div className="space-y-3">
              {wellDocs.length === 0 ? (
                <div className="panel p-8 text-center text-sm text-muted-foreground">
                  No scanned reports uploaded yet for well {well.well_name}.
                </div>
              ) : (
                wellDocs.map(d => (
                  <div key={d.id} className="panel p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <div className="font-semibold text-xs">{d.file_name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {d.document_type} · Status: <span className="text-teal font-semibold">{d.status}</span> · Uploaded: {d.uploaded_at}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-nums px-2 py-0.5 rounded border border-border bg-secondary">
                      {Math.round((d.confidence || 0.9) * 100)}% Conf
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
