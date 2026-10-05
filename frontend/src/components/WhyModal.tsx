import React from 'react';
import { X } from 'lucide-react';
import type { DrillingEvent } from '../types/nwis';
import { getFormationForDepth } from '../services/nwisData';
import { useNwis } from '../context/NwisContext';

interface WhyModalProps {
  currentDepth: number;
  eventsNear: DrillingEvent[];
  depthWindow: number;
  onClose: () => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({
  currentDepth,
  eventsNear,
  depthWindow,
  onClose
}) => {
  const { activeWell, proposedWell } = useNwis();
  const currentFm = getFormationForDepth(currentDepth);
  const targetName = activeWell?.well_name ?? proposedWell?.name ?? 'Active Target';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="panel p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">Why is this depth flagged?</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="panel-inset p-2">
            <div className="label-tag text-muted-foreground">Current Depth</div>
            <div className="font-mono-nums font-bold text-base mt-0.5">
              {currentDepth.toLocaleString()} m MD
            </div>
          </div>
          <div className="panel-inset p-2">
            <div className="label-tag text-muted-foreground">Formation</div>
            <div className="font-semibold text-sm mt-0.5">{activeWell?.formation_name ?? currentFm.name}</div>
          </div>
        </div>

        <div className="label-tag text-muted-foreground mb-1">
          Historical Evidence (±{depthWindow}m MD)
        </div>

        {eventsNear.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-3">
            No historical events recorded near this depth.
          </p>
        ) : (
          <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto pr-1">
            {eventsNear.map(ev => (
              <div key={ev.id} className="panel-inset p-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    {ev.well_id} · {ev.event_type}
                  </span>
                  <span className="font-mono-nums text-amber font-semibold">
                    {ev.diff != null ? `${ev.diff}m away` : `${Math.abs(ev.depth_m - currentDepth)}m away`}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 text-[11px]">
                  Distance: {ev.distance_km?.toFixed(1) || '—'} km · Event depth: {ev.depth_m} m MD
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="panel-inset p-3 bg-amber/10 border-amber/30 mb-3">
          <div className="label-tag text-amber mb-1">Reason for highlighting</div>
          <p className="text-xs leading-relaxed">
            {eventsNear.length > 0
              ? `${eventsNear.length} nearby historical well${
                  eventsNear.length > 1 ? 's have' : ' has'
                } recorded event${
                  eventsNear.length > 1 ? 's' : ''
                } within ±${depthWindow} m of the current depth. Historical context indicates elevated offset surveillance is warranted.`
              : 'No historical events are recorded within the current depth window.'}
          </p>
        </div>

        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-0.5">Evidence strength</p>
          <p>
            Based on historical records. Historical events were recorded near this depth in nearby
            wells — this serves as offset situational awareness for {targetName}.{' '}
            <span className="tag-proto">PROTOTYPE EVENT</span> data is structured for demonstration.
          </p>
        </div>
      </div>
    </div>
  );
};
