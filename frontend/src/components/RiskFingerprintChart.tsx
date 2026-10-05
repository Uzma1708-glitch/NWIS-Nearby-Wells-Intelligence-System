import React, { useMemo } from 'react';
import type { DrillingEvent } from '../types/nwis';
import { EVENT_TYPES, EVENT_COLORS } from '../services/nwisData';

interface RiskFingerprintChartProps {
  events: DrillingEvent[];
}

export const RiskFingerprintChart: React.FC<RiskFingerprintChartProps> = ({ events }) => {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    EVENT_TYPES.forEach(t => (map[t] = 0));
    events.forEach(e => {
      map[e.event_type] = (map[e.event_type] || 0) + 1;
    });
    return map;
  }, [events]);

  const maxVal = Math.max(1, ...Object.values(counts));
  const sortedEntries = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="panel p-4">
      <div className="label-tag text-muted-foreground mb-3">Historical Risk Fingerprint</div>
      {sortedEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No historical event records are currently available for the nearby wells in this radius.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedEntries.map(([type, count]) => (
            <div key={type} className="flex items-center gap-3">
              <span className="w-36 text-xs text-muted-foreground truncate" title={type}>
                {type}
              </span>
              <div className="flex-1 h-3 rounded-sm bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${(count / maxVal) * 100}%`,
                    background: EVENT_COLORS[type] || 'hsl(var(--steel))'
                  }}
                />
              </div>
              <span className="w-6 text-right text-xs font-mono-nums font-semibold">{count}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-3">
        Computed from prototype event records within the current search radius.
      </p>
    </div>
  );
};
