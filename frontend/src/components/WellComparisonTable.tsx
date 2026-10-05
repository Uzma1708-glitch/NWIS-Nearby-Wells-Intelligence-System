import React, { useMemo } from 'react';
import type { Well, ProposedWell } from '../types/nwis';
import { generateWellEvents, getFormationForDepth } from '../services/nwisData';

interface WellComparisonTableProps {
  proposedWell: ProposedWell | null;
  nearbyWells: Well[];
  selectedWellIds: string[];
  onToggle: (id: string) => void;
  currentDepth: number;
}

export const WellComparisonTable: React.FC<WellComparisonTableProps> = ({
  proposedWell,
  nearbyWells,
  selectedWellIds,
  currentDepth
}) => {
  const selectedWells = nearbyWells
    .filter(w => selectedWellIds.includes(w.well_id))
    .slice(0, 4);

  const targetName = proposedWell?.name || 'P-01';

  const allWells = useMemo(() => {
    const p01: Well | null = proposedWell
      ? {
          id: targetName.toLowerCase(),
          well_id: targetName,
          well_name: `${targetName} (Proposed)`,
          latitude: proposedWell.lat,
          longitude: proposedWell.lng,
          distance_km: 0,
          end_depth_m: null,
          status: 'Proposed'
        }
      : null;

    return [p01, ...selectedWells].filter(Boolean) as Well[];
  }, [proposedWell, selectedWells, targetName]);

  const comparisons = useMemo(
    () =>
      allWells.map(w => {
        const isTarget = w.well_id === targetName;
        const events = isTarget ? [] : generateWellEvents(w);
        const overlap = !isTarget && w.end_depth_m ? Math.min(w.end_depth_m, currentDepth) : currentDepth;
        const depthEvents = events.filter(e => Math.abs(e.depth_m - currentDepth) <= 50);

        return {
          well: w,
          events,
          overlap,
          depthEvents
        };
      }),
    [allWells, currentDepth, targetName]
  );

  if (selectedWells.length === 0) {
    return (
      <div className="panel p-4">
        <div className="label-tag text-muted-foreground mb-1">Well Comparison</div>
        <p className="text-sm text-muted-foreground">
          Select nearby wells (Compare) from the Overview or list to compare them against {targetName}.
        </p>
      </div>
    );
  }

  const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="panel-inset p-2.5">
      <div className="label-tag text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="label-tag text-muted-foreground">Well Comparison</span>
        <span className="text-[11px] text-muted-foreground font-mono-nums">
          vs {targetName} @ {currentDepth} m
        </span>
      </div>

      <div
        className="grid gap-2 overflow-x-auto pb-2"
        style={{ gridTemplateColumns: `repeat(${allWells.length}, minmax(160px, 1fr))` }}
      >
        {comparisons.map(({ well, events, overlap, depthEvents }) => {
          const isTarget = well.well_id === targetName;

          return (
            <div key={well.well_id} className="space-y-2">
              <div
                className={`p-2.5 rounded-md ${
                  isTarget ? 'bg-critical/10 border border-critical/30' : 'bg-secondary border border-border'
                }`}
              >
                <div className="font-semibold text-sm truncate">{well.well_name}</div>
                <div className="text-[10px] text-muted-foreground">{well.well_id}</div>
              </div>

              <Cell label="Distance">
                <span className="text-sm font-mono-nums font-semibold">
                  {well.distance_km != null ? `${well.distance_km.toFixed(2)} km` : '0 km'}
                </span>
              </Cell>

              <Cell label="Total Depth">
                <span className="text-sm font-mono-nums font-semibold">
                  {well.end_depth_m ? `${well.end_depth_m} m` : '—'}
                </span>
              </Cell>

              <Cell label={`Depth Overlap @ ${targetName}`}>
                <span className="text-sm font-mono-nums font-semibold">
                  {Math.round(overlap)} m
                </span>
              </Cell>

              <Cell label="Formation @ Depth">
                <span className="text-xs font-semibold">
                  {getFormationForDepth(currentDepth).name}
                </span>
              </Cell>

              <Cell label="Historical Events">
                <span className="text-sm font-mono-nums font-semibold">{events.length}</span>
              </Cell>

              <Cell label="Events ±50m">
                <div className="space-y-0.5">
                  {depthEvents.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">None</span>
                  ) : (
                    depthEvents.map(ev => (
                      <div key={ev.id} className="text-[10px] truncate" title={`${ev.event_type} · ${ev.depth_m}m`}>
                        {ev.event_type} · {ev.depth_m}m
                      </div>
                    ))
                  )}
                </div>
              </Cell>
            </div>
          );
        })}
      </div>
    </div>
  );
};
