import React, { useState, useMemo } from 'react';
import { useNwis } from '../../context/NwisContext';
import { ExplainableAlertCard } from '../../components/ExplainableAlertCard';
import { WellComparisonTable } from '../../components/WellComparisonTable';
import { EvidenceModal } from '../../components/EvidenceModal';
import { getFormationForDepth, EVENT_COLORS } from '../../services/nwisData';
import type { DrillingEvent } from '../../types/nwis';

export const RiskTab: React.FC = () => {
  const {
    nearbyWells,
    events,
    riskZones,
    currentDepth,
    setCurrentDepth,
    selectedWellIds,
    toggleSelectedWell,
    proposedWell
  } = useNwis();

  const [evidenceEvent, setEvidenceEvent] = useState<DrillingEvent | null>(null);

  // Compute Evidence Scores
  const scores = useMemo(() => {
    const depthEvents = events.filter(e => Math.abs(e.depth_m - currentDepth) <= 75);
    const depthSim = Math.min(1, depthEvents.length / 4);
    const currentFm = getFormationForDepth(currentDepth).name;
    const formationEvents = events.filter(e => e.formation === currentFm).length;
    const formMatch = Math.min(1, formationEvents / 8);
    const nearbyEv = Math.min(1, events.length / 12);
    const freq = Math.min(1, depthEvents.length / 5);

    return { depthSim, formMatch, nearbyEv, freq };
  }, [events, currentDepth]);

  const activeZone = riskZones.find(
    z => currentDepth >= z.top - 25 && currentDepth <= z.bottom + 25
  );

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div className="flex items-center gap-3">
      <span className="w-36 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2.5 rounded-sm bg-secondary overflow-hidden">
        <div
          className="h-full rounded-sm bg-steel transition-all duration-300"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-mono-nums">{Math.round(value * 100)}</span>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* Left: Historical Risk Zones */}
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="label-tag text-muted-foreground">Historical Risk Zones (depth)</span>
            <span className="tag-proto">PROTOTYPE</span>
          </div>

          {riskZones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No historical risk zones derived from nearby-well events in this radius.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {riskZones.map((z, idx) => {
                const isSelected =
                  currentDepth >= z.top - 25 && currentDepth <= z.bottom + 25;

                const eventTypeCounts: Record<string, number> = {};
                z.events.forEach(e => {
                  eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1;
                });

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentDepth(Math.round((z.top + z.bottom) / 2))}
                    className={`w-full text-left p-2.5 rounded-md border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-nums text-sm font-semibold">
                        {z.top}–{z.bottom} m
                      </span>
                      <span
                        className={`data-tag border ${
                          z.severity === 'High'
                            ? 'text-critical bg-critical/10 border-critical/30'
                            : 'text-amber bg-amber/10 border-amber/30'
                        }`}
                      >
                        {z.severity}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {z.formation} · {z.count} events · {z.wells.length} wells
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(eventTypeCounts).map(([type, count]) => (
                        <span key={type} className="text-[10px] flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: EVENT_COLORS[type] || 'hsl(var(--steel))' }}
                          />
                          {count}×{type}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Explainable Alerts & Historical Evidence Score */}
        <div className="space-y-4">
          <ExplainableAlertCard
            currentDepth={currentDepth}
            riskZones={riskZones}
            events={events}
            onEvidence={ev => setEvidenceEvent(ev)}
            onCompare={wellIds => {
              wellIds.forEach(id => {
                if (!selectedWellIds.includes(id)) {
                  toggleSelectedWell(id);
                }
              });
            }}
          />

          <div className="panel p-4">
            <div className="label-tag text-muted-foreground mb-3">Historical Evidence Score</div>
            <div className="space-y-2.5">
              <ScoreBar label="Depth similarity" value={scores.depthSim} />
              <ScoreBar label="Formation match" value={scores.formMatch} />
              <ScoreBar label="Nearby well evidence" value={scores.nearbyEv} />
              <ScoreBar label="Event frequency" value={scores.freq} />
            </div>

            <p className="text-[11px] text-muted-foreground mt-3">
              {activeZone
                ? 'Historical evidence indicates elevated risk. Historical context requires engineering review.'
                : 'No strong historical overlap at the current depth. Continue monitoring.'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Prototype hazard classification — not a validated prediction of drilling outcome.
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Well Comparison Matrix */}
      <WellComparisonTable
        proposedWell={proposedWell}
        nearbyWells={nearbyWells}
        selectedWellIds={selectedWellIds}
        onToggle={toggleSelectedWell}
        currentDepth={currentDepth}
      />

      {evidenceEvent && (
        <EvidenceModal event={evidenceEvent} onClose={() => setEvidenceEvent(null)} />
      )}
    </div>
  );
};
