import React, { useMemo } from 'react';
import { AlertTriangle, FileText, SplitSquareVertical } from 'lucide-react';
import type { RiskZone, DrillingEvent } from '../types/nwis';
import { getFormationForDepth, EVENT_COLORS } from '../services/nwisData';

interface ExplainableAlertCardProps {
  currentDepth: number;
  riskZones: RiskZone[];
  events: DrillingEvent[];
  onEvidence?: (event: DrillingEvent) => void;
  onCompare?: (wellIds: string[]) => void;
}

export const ExplainableAlertCard: React.FC<ExplainableAlertCardProps> = ({
  currentDepth,
  riskZones,
  onEvidence,
  onCompare
}) => {
  const matchingZone = useMemo(
    () => riskZones.find(z => currentDepth >= z.top - 25 && currentDepth <= z.bottom + 25),
    [riskZones, currentDepth]
  );

  if (!matchingZone) {
    return (
      <div className="panel p-4">
        <div className="label-tag text-muted-foreground mb-1">Explainable Alerts</div>
        <p className="text-sm text-muted-foreground">
          No historical risk zone overlaps the current depth ({currentDepth} m). Continue monitoring.
        </p>
      </div>
    );
  }

  const formation = getFormationForDepth((matchingZone.top + matchingZone.bottom) / 2);
  const eventCounts: Record<string, number> = {};
  matchingZone.events.forEach(e => {
    eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
  });

  const isHigh = matchingZone.severity === 'High';

  return (
    <div
      className="panel p-4 border-l-4"
      style={{
        borderLeftColor: isHigh ? 'hsl(var(--critical))' : 'hsl(var(--amber))'
      }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className={`w-5 h-5 ${isHigh ? 'text-critical' : 'text-amber'}`}
        />
        <span className="font-bold text-sm">
          HISTORICAL RISK · {matchingZone.severity.toUpperCase()}
        </span>
        <span className="tag-proto ml-auto">PROTOTYPE</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
        <div>
          <span className="text-muted-foreground">Current depth:</span>{' '}
          <span className="font-mono-nums font-semibold">{currentDepth} m</span>
        </div>
        <div>
          <span className="text-muted-foreground">Historical overlap:</span>{' '}
          <span className="font-mono-nums font-semibold">
            {matchingZone.top}–{matchingZone.bottom} m
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Formation:</span>{' '}
          <span className="font-semibold">{formation.name}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Nearby wells:</span>{' '}
          <span className="font-semibold">{matchingZone.wells.length}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="label-tag text-muted-foreground mb-1">Relevant Wells</div>
        <div className="flex flex-wrap gap-1.5">
          {matchingZone.wells.map(wId => (
            <span key={wId} className="data-tag border-border bg-secondary">
              {wId}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="label-tag text-muted-foreground mb-1">Historical Events</div>
        <div className="space-y-1">
          {Object.entries(eventCounts).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: EVENT_COLORS[type] || 'hsl(var(--steel))' }}
              />
              <span>
                {count} × {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 panel-inset p-2.5">
        <div className="label-tag text-muted-foreground">Why?</div>
        <p className="text-xs mt-1 leading-relaxed">
          {matchingZone.wells.length} nearby well
          {matchingZone.wells.length > 1 ? 's' : ''} recorded relevant historical events
          within the comparable depth/formation interval ({matchingZone.top}–
          {matchingZone.bottom} m, {formation.name}). Historical context requires
          engineering review.
        </p>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onEvidence && onEvidence(matchingZone.events[0])}
          className="flex-1 h-9 rounded-md border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          View Evidence
        </button>
        <button
          onClick={() => onCompare && onCompare(matchingZone.wells)}
          className="flex-1 h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          Compare Wells
        </button>
      </div>
    </div>
  );
};
