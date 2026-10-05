import React from 'react';
import { X, Printer } from 'lucide-react';
import { useNwis } from '../context/NwisContext';
import { getFormationForDepth } from '../services/nwisData';

interface BriefModalProps {
  onClose: () => void;
}

export const BriefModal: React.FC<BriefModalProps> = ({ onClose }) => {
  const { activeWell, proposedWell, searchRadius, nearbyWells, events, riskZones, currentDepth } = useNwis();
  const currentFm = getFormationForDepth(currentDepth);

  const targetWellName = activeWell?.well_name ?? proposedWell?.name ?? 'Active Target';
  const targetLat = activeWell?.latitude ?? proposedWell?.lat ?? 52.215;
  const targetLng = activeWell?.longitude ?? proposedWell?.lng ?? 6.815;
  const targetFmName = activeWell?.formation_name ?? currentFm.name;

  const eventCounts: Record<string, number> = {};
  events.forEach(e => {
    eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
  });

  const displayNearby = nearbyWells.slice(0, 8);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary border-b border-border pb-1 mb-2">
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0">
          <div>
            <div className="font-display font-bold">NWIS Intelligence Brief</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Target Well {targetWellName} · Radius {searchRadius}km · Generated {new Date().toISOString().slice(0, 10)}
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="export-btn h-9 px-3 rounded-md border border-border bg-card hover:bg-secondary text-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onClose}
              className="close-btn text-muted-foreground hover:text-foreground cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          <div className="brief-callout-info mb-5 text-xs">
            <span className="font-semibold text-slate-800">Scope:</span>{' '}
            Contextual drilling-intelligence summary for active target well <strong className="text-slate-900">{targetWellName}</strong>, derived from NLOG
            nearby-well records and structured historical offset event data. This is a decision-support brief —
            not an operational drilling program.
          </div>

          <Section title="1 · Target Well & Geospatial Scope">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-1.5 text-slate-600 w-40">Target well name</td>
                  <td className="py-1.5 font-semibold text-slate-900">{targetWellName} (Active Target)</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600">Latitude</td>
                  <td className="py-1.5 font-mono-nums text-slate-900">{targetLat.toFixed(5)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600">Longitude</td>
                  <td className="py-1.5 font-mono-nums text-slate-900">{targetLng.toFixed(5)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600">Search radius</td>
                  <td className="py-1.5 font-mono-nums text-slate-900">{searchRadius} km</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-600">Evaluation depth</td>
                  <td className="py-1.5 font-mono-nums text-slate-900">
                    {currentDepth} m MD · {targetFmName}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="2 · Nearby Wells (NLOG Source)">
            <div className="text-xs mb-2">
              {nearbyWells.length} wells within {searchRadius} km.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-700 text-left border-b border-border">
                    <th className="py-1.5 font-semibold text-left">Well</th>
                    <th className="py-1.5 font-semibold text-left">Field</th>
                    <th className="py-1.5 font-semibold text-right">TD (m)</th>
                    <th className="py-1.5 font-semibold text-right">Dist (km)</th>
                    <th className="py-1.5 font-semibold text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayNearby.map(w => (
                    <tr key={w.well_id}>
                      <td className="py-1.5 font-semibold text-slate-900">{w.well_id}</td>
                      <td className="py-1.5 text-slate-800">{w.field_name || '—'}</td>
                      <td className="py-1.5 font-mono-nums text-right text-slate-900">{w.end_depth_m || '—'}</td>
                      <td className="py-1.5 font-mono-nums text-right text-slate-900">{w.distance_km?.toFixed(2)}</td>
                      <td className="py-1.5 text-slate-800">{w.status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="3 · Historical Events Summary">
            <p className="text-xs mb-2">
              {events.length} prototype historical event records across nearby wells.
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventCounts).map(([type, count]) => (
                <div key={type} className="panel-inset px-2.5 py-1.5 text-xs">
                  <span className="font-semibold">{count}</span> × {type}
                </div>
              ))}
              {events.length === 0 && (
                <span className="text-xs text-muted-foreground">No historical events recorded.</span>
              )}
            </div>
          </Section>

          <Section title="4 · Historical Risk Zones">
            {riskZones.length === 0 ? (
              <p className="text-xs text-muted-foreground">No historical risk zones derived.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-700 text-left border-b-2 border-slate-300">
                      <th className="py-1.5 font-semibold text-left">Depth Interval (m)</th>
                      <th className="py-1.5 font-semibold text-left">Formation / Lithology</th>
                      <th className="py-1.5 font-semibold text-left">Risk Level</th>
                      <th className="py-1.5 font-semibold text-right">Event Count</th>
                      <th className="py-1.5 font-semibold text-right">Well Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {riskZones.map((z, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 font-mono-nums text-slate-900">
                          {z.top}–{z.bottom}
                        </td>
                        <td className="py-1.5 text-slate-800">{z.formation}</td>
                        <td className="py-1.5">
                          <span className={`badge ${z.severity === 'High' ? 'badge-high' :
                              z.severity === 'Medium' ? 'badge-medium' :
                                'badge-low'
                            }`}>{z.severity}</span>
                        </td>
                        <td className="py-1.5 font-mono-nums text-right text-slate-900">{z.count}</td>
                        <td className="py-1.5 font-mono-nums text-right text-slate-900">{z.wells.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            )}
          </Section>

          <Section title="5 · Key Evidence & Historical Responses">
            {events.slice(0, 4).map(e => (
              <div key={e.id} className="panel-inset p-2.5 mb-2 text-xs break-inside-avoid">
                <div className="font-semibold text-slate-900">
                  {e.well_id} · {e.event_type} @ {e.depth_m} m
                  {' '}(<span className={`badge ${e.severity === 'High' ? 'badge-high' :
                      e.severity === 'Medium' ? 'badge-medium' :
                        'badge-low'
                    }`}>{e.severity}</span>)
                </div>
                <div className="text-slate-700 mt-0.5">
                  Historical response: {e.mitigation}
                </div>
                <div className="text-[10px] text-slate-600 mt-1">
                  Source: {e.source_doc_id}, p.{e.source_page}
                </div>
              </div>
            ))}
          </Section>

          <Section title="6 · Prototype Hazard Observations">
            <div className="brief-callout-warning break-inside-avoid">
              <p className="text-xs leading-relaxed text-slate-800">
                Prototype hazard classification (simulated model) flagged intervals where historical
                events concentrate. This is{' '}
                <span className="font-bold text-slate-900">not</span> a validated
                drilling-outcome prediction. Historical context requires independent engineering
                review before any operational decisions are made.
              </p>
            </div>
          </Section>

          <div className="brief-callout-disclaimer mt-4 text-[10px] break-inside-avoid">
            <span className="font-semibold text-slate-800">Disclaimer: </span>
            <span className="text-slate-700">
              NWIS prototype · NLOG source data (wells) · PROTOTYPE event records · SIMULATED
              telemetry · PROTOTYPE hazard model. No real-time operational data is represented.
              This document must not be used as the basis for operational drilling decisions
              without independent technical validation.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
