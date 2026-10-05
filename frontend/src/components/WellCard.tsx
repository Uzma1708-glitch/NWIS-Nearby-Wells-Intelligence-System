import React from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import type { Well } from '../types/nwis';

interface WellCardProps {
  well: Well;
  distanceKm?: number;
  eventCount: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  compact?: boolean;
}

export const WellCard: React.FC<WellCardProps> = ({
  well,
  distanceKm,
  eventCount,
  selected = false,
  onToggleSelect,
  compact = false
}) => {
  return (
    <div
      className={`panel p-3 transition-colors ${
        selected ? 'ring-1 ring-primary border-primary' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{well.well_name}</span>
            <span className="tag-nlog">NLOG</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {well.well_id} · NITG {well.nitg_number || '—'}
          </div>
        </div>

        {onToggleSelect && (
          <button
            onClick={() => onToggleSelect(well.well_id)}
            className={`text-[11px] px-2 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
              selected
                ? 'bg-primary text-primary-foreground border-primary font-semibold'
                : 'border-border hover:bg-secondary'
            }`}
          >
            {selected ? 'Selected' : 'Compare'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="truncate">{well.field_name || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-muted-foreground shrink-0" />
          <span>{distanceKm != null ? `${distanceKm.toFixed(2)} km` : '—'}</span>
        </div>
        <div>
          TD: <span className="font-mono-nums font-semibold">{well.end_depth_m ? `${well.end_depth_m} m` : '—'}</span>
        </div>
        <div>
          Status: <span className="text-muted-foreground">{well.status || '—'}</span>
        </div>
        {!compact && (
          <div className="flex items-center gap-1.5 col-span-2">
            <AlertCircle className="w-3 h-3 text-muted-foreground shrink-0" />
            <span>Historical events: </span>
            <span className="font-mono-nums font-semibold">{eventCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
