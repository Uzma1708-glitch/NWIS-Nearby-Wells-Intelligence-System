import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useNwis } from '../../context/NwisContext';
import { RiskFingerprintChart } from '../../components/RiskFingerprintChart';
import { EvidenceModal } from '../../components/EvidenceModal';
import {
  EVENT_TYPES,
  EVENT_SEVERITIES,
  EVENT_COLORS,
  FORMATIONS
} from '../../services/nwisData';
import type { DrillingEvent } from '../../types/nwis';

export const HistoryTab: React.FC = () => {
  const { events, nearbyWells } = useNwis();

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSev, setSelectedSev] = useState('all');
  const [selectedFm, setSelectedFm] = useState('all');
  const [selectedWell, setSelectedWell] = useState('all');

  const [evidenceEvent, setEvidenceEvent] = useState<DrillingEvent | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (search) {
        const text = `${e.well_id} ${e.well_name} ${e.description} ${e.event_type}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      if (selectedType !== 'all' && e.event_type !== selectedType) return false;
      if (selectedSev !== 'all' && e.severity !== selectedSev) return false;
      if (selectedFm !== 'all' && e.formation !== selectedFm) return false;
      if (selectedWell !== 'all' && e.well_id !== selectedWell) return false;
      return true;
    });
  }, [events, search, selectedType, selectedSev, selectedFm, selectedWell]);

  const nearbyOptions = nearbyWells.slice(0, 80);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Filters Bar */}
      <div className="panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events, wells, descriptions…"
              className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={selectedWell}
            onChange={e => setSelectedWell(e.target.value)}
            className="h-9 px-2 rounded-md border border-input bg-card text-sm cursor-pointer"
          >
            <option value="all">All wells</option>
            {nearbyOptions.map(w => (
              <option key={w.well_id} value={w.well_id}>
                {w.well_id}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="h-9 px-2 rounded-md border border-input bg-card text-sm cursor-pointer"
          >
            <option value="all">All types</option>
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedSev}
            onChange={e => setSelectedSev(e.target.value)}
            className="h-9 px-2 rounded-md border border-input bg-card text-sm cursor-pointer"
          >
            <option value="all">All severity</option>
            {EVENT_SEVERITIES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedFm}
            onChange={e => setSelectedFm(e.target.value)}
            className="h-9 px-2 rounded-md border border-input bg-card text-sm cursor-pointer"
          >
            <option value="all">All formations</option>
            {FORMATIONS.map(f => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
        {/* Left: Events List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label-tag text-muted-foreground">
              Historical Events ({filteredEvents.length})
            </span>
            <span className="tag-proto">PROTOTYPE RECORDS</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="panel p-6 text-center text-sm text-muted-foreground">
              No historical event records match the current filters for the nearby wells.
            </div>
          ) : (
            <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
              {filteredEvents.map(e => {
                const sevBadge =
                  e.severity === 'High'
                    ? 'text-critical bg-critical/10 border-critical/30'
                    : e.severity === 'Medium'
                    ? 'text-amber bg-amber/10 border-amber/30'
                    : 'text-steel bg-steel/10 border-steel/30';

                return (
                  <div key={e.id} className="panel p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: EVENT_COLORS[e.event_type] || 'hsl(var(--steel))' }}
                      />
                      <span className="font-semibold text-sm">{e.event_type}</span>
                      <span className={`data-tag border ${sevBadge}`}>{e.severity}</span>
                      <span className="tag-proto ml-auto">PROTOTYPE EVENT</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-muted-foreground">
                      <div>
                        Well: <span className="text-foreground font-semibold">{e.well_id}</span>
                      </div>
                      <div>
                        Depth:{' '}
                        <span className="text-foreground font-mono-nums font-semibold">
                          {e.depth_m} m
                        </span>
                      </div>
                      <div>
                        Formation: <span className="text-foreground">{e.formation}</span>
                      </div>
                    </div>

                    <p className="text-xs mt-2 text-foreground/90 leading-relaxed">
                      {e.description}
                    </p>

                    {e.mitigation && (
                      <div className="mt-2 panel-inset p-2">
                        <div className="label-tag text-muted-foreground">Historical Response</div>
                        <p className="text-xs mt-1 leading-relaxed">{e.mitigation}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-[11px]">
                      <span className="text-muted-foreground">{e.evidence_ref}</span>
                      <button
                        onClick={() => setEvidenceEvent(e)}
                        className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        View Evidence →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Risk Fingerprint & Evidence Panel */}
        <div className="space-y-4">
          <RiskFingerprintChart events={events} />

          {/* Embedded Evidence viewer preview if selected */}
          {evidenceEvent ? (
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="label-tag text-muted-foreground">
                  Document Intelligence · Evidence Trace
                </span>
                <button
                  onClick={() => setEvidenceEvent(null)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="panel-inset p-2.5 col-span-2">
                  <div className="label-tag text-muted-foreground mb-1">Source Document</div>
                  <div className="font-semibold text-sm">{evidenceEvent.source_doc}</div>
                  <div className="text-muted-foreground mt-0.5">
                    Page {evidenceEvent.source_page} · Reference {evidenceEvent.source_doc_id}
                  </div>
                </div>
                <div className="panel-inset p-2.5">
                  <div className="label-tag text-muted-foreground">Well</div>
                  <div className="font-semibold mt-1">{evidenceEvent.well_name}</div>
                </div>
                <div className="panel-inset p-2.5">
                  <div className="label-tag text-muted-foreground">Depth / Formation</div>
                  <div className="font-semibold mt-1">
                    {evidenceEvent.depth_m} m · {evidenceEvent.formation}
                  </div>
                </div>
                <div className="panel-inset p-2.5 col-span-2">
                  <div className="label-tag text-muted-foreground">Historical Response</div>
                  <div className="mt-1 leading-relaxed">{evidenceEvent.mitigation}</div>
                </div>
              </div>

              <div className="mt-3 panel-inset p-3 bg-secondary/40 font-mono-nums text-[11px] text-muted-foreground leading-relaxed">
                … drilling continued through {evidenceEvent.formation} at {evidenceEvent.depth_m} m.{' '}
                Observed {evidenceEvent.event_type.toLowerCase()} —{' '}
                {evidenceEvent.description.replace(/.*\./, '').toLowerCase()} Mitigation:{' '}
                {evidenceEvent.mitigation} …
              </div>
            </div>
          ) : (
            <div className="panel p-6 text-center text-sm text-muted-foreground">
              Select an event and choose “View Evidence” to trace it back to its source document.
            </div>
          )}
        </div>
      </div>

      {evidenceEvent && (
        <EvidenceModal event={evidenceEvent} onClose={() => setEvidenceEvent(null)} />
      )}
    </div>
  );
};
