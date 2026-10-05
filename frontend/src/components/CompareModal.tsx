import React from 'react';
import { X } from 'lucide-react';
import type { DrillingEvent } from '../types/nwis';
import { getFormationForDepth } from '../services/nwisData';
import { useNwis } from '../context/NwisContext';

interface CompareModalProps {
  currentDepth: number;
  eventsNear: DrillingEvent[];
  depthWindow: number;
  onClose: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  currentDepth,
  eventsNear,
  depthWindow,
  onClose
}) => {
  const { proposedWell } = useNwis();
  const targetName = proposedWell?.name || 'P-01';
  const currentFm = getFormationForDepth(currentDepth);

  const uniqueWellsEvents: DrillingEvent[] = [];
  const seenWells = new Set<string>();

  eventsNear.forEach(e => {
    if (!seenWells.has(e.well_id)) {
      seenWells.add(e.well_id);
      uniqueWellsEvents.push(e);
    }
  });

  const displayWells = uniqueWellsEvents.slice(0, 4);

  const ColumnCard = ({
    title,
    subtitle,
    accent,
    rows
  }: {
    title: string;
    subtitle: string;
    accent: string;
    rows: { label: string; value: string; mono?: boolean }[];
  }) => (
    <div className="space-y-2">
      <div className={`p-2.5 rounded-md ${accent}`}>
        <div className="font-semibold text-sm truncate">{title}</div>
        <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="panel-inset p-2">
          <div className="label-tag text-muted-foreground">{r.label}</div>
          <div className={`text-sm ${r.mono ? 'font-mono-nums' : ''} font-semibold mt-0.5`}>
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="panel p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">
            Depth Comparison · {targetName} vs nearby wells
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {displayWells.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No nearby wells with historical events within ±{depthWindow} m of the current depth to
            compare.
          </p>
        ) : (
          <div
            className="grid gap-3 overflow-x-auto pb-2"
            style={{ gridTemplateColumns: `repeat(${displayWells.length + 1}, minmax(150px, 1fr))` }}
          >
            <ColumnCard
              title={targetName}
              subtitle="Proposed"
              accent="bg-critical/10 border border-critical/30"
              rows={[
                { label: 'Current Depth', value: `${currentDepth.toLocaleString()} m`, mono: true },
                { label: 'Formation', value: currentFm ? currentFm.name : '—' },
                { label: 'Distance', value: '0 km', mono: true },
                { label: 'Event', value: '—' }
              ]}
            />
            {displayWells.map(e => (
              <ColumnCard
                key={e.id}
                title={e.well_id}
                subtitle={e.well_name}
                accent="bg-secondary border border-border"
                rows={[
                  { label: 'Hist. Depth', value: `${e.depth_m} m`, mono: true },
                  { label: 'Formation', value: e.formation },
                  {
                    label: 'Distance',
                    value: e.distance_km != null ? `${e.distance_km.toFixed(1)} km` : '—',
                    mono: true
                  },
                  { label: 'Event', value: e.event_type }
                ]}
              />
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-3">
          Comparison focused on wells with historical events within ±{depthWindow} m of current
          depth. <span className="tag-proto">PROTOTYPE EVENT</span>
        </p>
      </div>
    </div>
  );
};
