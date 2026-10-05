import React, { useState, useMemo } from 'react';
import { Map, Layers, HelpCircle, SplitSquareVertical, FileText, AlertCircle } from 'lucide-react';
import { useNwis } from '../../context/NwisContext';
import { MapView } from '../../components/MapView';
import { SubsurfaceCrossSection } from '../../components/SubsurfaceCrossSection';
import { DepthSlider } from '../../components/DepthSlider';
import { WhyModal } from '../../components/WhyModal';
import { CompareModal } from '../../components/CompareModal';
import { EvidenceModal } from '../../components/EvidenceModal';
import { getFormationForDepth, EVENT_TYPES, EVENT_COLORS } from '../../services/nwisData';
import type { DrillingEvent } from '../../types/nwis';

export const SubsurfaceTab: React.FC = () => {
  const {
    wells,
    proposedWell,
    searchRadius,
    nearbyWells,
    events,
    riskZones,
    currentDepth,
    setCurrentDepth,
    setActiveWell
  } = useNwis();

  const [viewMode, setViewMode] = useState<'surface' | 'subsurface'>('subsurface');
  const [depthWindow, setDepthWindow] = useState<number>(30);

  // Modals state
  const [showWhy, setShowWhy] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DrillingEvent | null>(null);

  const maxDepth = useMemo(() => {
    const depths = nearbyWells.map(w => Number(w.end_depth_m) || 0);
    return Math.min(3600, Math.max(2500, ...depths));
  }, [nearbyWells]);

  const currentFm = getFormationForDepth(currentDepth);
  const nearbyWellIds = useMemo(() => nearbyWells.map(w => w.well_id), [nearbyWells]);
  const riskWellIds = useMemo(() => [...new Set(riskZones.flatMap(z => z.wells))], [riskZones]);

  // Wells reaching current depth
  const wellsAtDepth = useMemo(
    () =>
      nearbyWells
        .filter(w => Number(w.end_depth_m) >= currentDepth)
        .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
        .slice(0, 6),
    [nearbyWells, currentDepth]
  );

  // Events within depth window
  const eventsInWindow = useMemo(
    () =>
      events
        .map(e => ({ ...e, diff: Math.abs(e.depth_m - currentDepth) }))
        .filter(e => e.diff <= depthWindow)
        .sort((a, b) => a.diff - b.diff),
    [events, currentDepth, depthWindow]
  );

  // Category distribution in window
  const categoriesInWindow = useMemo(() => {
    const counts: Record<string, number> = {};
    EVENT_TYPES.forEach(t => (counts[t] = 0));
    eventsInWindow.forEach(e => {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [eventsInWindow]);

  const maxCatCount = Math.max(1, ...categoriesInWindow.map(([, c]) => c));

  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-y-auto lg:overflow-hidden">
      {/* Top Bar with Mode Switcher & Well Coordinates */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('surface')}
            className={`px-3 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors ${
              viewMode === 'surface'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-secondary'
            }`}
          >
            <Map className="w-4 h-4" />
            Surface
          </button>
          <button
            onClick={() => setViewMode('subsurface')}
            className={`px-3 h-9 text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors ${
              viewMode === 'subsurface'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card hover:bg-secondary'
            }`}
          >
            <Layers className="w-4 h-4" />
            Subsurface
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <div>
            <span className="label-tag text-muted-foreground">{proposedWell?.name || 'P-01'}</span>{' '}
            <span className="font-mono-nums font-semibold ml-1">
              {proposedWell?.lat?.toFixed(4)}, {proposedWell?.lng?.toFixed(4)}
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="label-tag text-muted-foreground">Formation</span>{' '}
            <span className="font-semibold ml-1">{currentFm.name}</span>
          </div>
        </div>
      </div>

      {viewMode === 'surface' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3 lg:flex-1 lg:min-h-0">
          <div className="panel p-1 h-[55vh] lg:h-full min-h-0 overflow-hidden">
            <MapView
              wells={wells}
              proposedWell={proposedWell}
              radiusKm={searchRadius}
              nearbyWellIds={nearbyWellIds}
              riskWellIds={riskWellIds}
              onSelectWell={(w: any) => setActiveWell(w.well_name || w.well_id)}
              height="100%"
            />
          </div>
          <div className="panel p-4 h-[44vh] lg:h-full overflow-y-auto">
            <div className="label-tag text-muted-foreground mb-3">Distance from {proposedWell?.name || 'P-01'}</div>
            <div className="space-y-1.5">
              {nearbyWells.slice(0, 50).map(w => (
                <div
                  key={w.well_id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-border/60"
                >
                  <span className="truncate">{w.well_name}</span>
                  <span className="font-mono-nums font-semibold ml-2">
                    {w.distance_km?.toFixed(2)} km
                  </span>
                </div>
              ))}
              {nearbyWells.length === 0 && (
                <p className="text-sm text-muted-foreground">No nearby wells in radius.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3 lg:flex-1 lg:min-h-0">
            {/* SVG Geological Cross Section */}
            <div className="h-[55vh] lg:h-full min-h-0">
              <SubsurfaceCrossSection
                proposedWell={proposedWell}
                nearbyWells={nearbyWells}
                events={events}
                currentDepth={currentDepth}
                setCurrentDepth={setCurrentDepth}
                maxDepth={maxDepth}
                depthWindow={depthWindow}
              />
            </div>

            {/* Depth Intelligence Panel */}
            <div className="h-[48vh] lg:h-full min-h-0">
              <div className="panel p-4 h-full overflow-y-auto flex flex-col gap-3">
                {/* Header with Depth Window Buttons */}
                <div className="flex items-center justify-between">
                  <div className="label-tag text-muted-foreground">Depth Intelligence</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground mr-0.5">Window</span>
                    {[10, 30, 50].map(w => (
                      <button
                        key={w}
                        onClick={() => setDepthWindow(w)}
                        className={`px-1.5 h-6 rounded text-[10px] font-mono-nums border cursor-pointer transition-colors ${
                          depthWindow === w
                            ? 'bg-primary text-primary-foreground border-primary font-bold'
                            : 'bg-card border-border hover:bg-secondary'
                        }`}
                      >
                        ±{w}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Depth Inset */}
                <div className="panel-inset p-3">
                  <div className="label-tag text-muted-foreground">Current Depth</div>
                  <div className="font-mono-nums text-3xl font-bold text-primary leading-none mt-0.5">
                    {currentDepth.toLocaleString()}{' '}
                    <span className="text-base text-muted-foreground font-normal">m</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="label-tag text-muted-foreground block">Formation</span>
                      <span className="font-semibold">{currentFm.name}</span>
                    </div>
                    <div>
                      <span className="label-tag text-muted-foreground block">Interval</span>
                      <span className="font-mono-nums font-semibold">
                        {currentFm.top}–{currentFm.bottom} m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nearby Wells at This Depth */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="label-tag text-muted-foreground">Nearby Wells at This Depth</div>
                    <span className="text-[10px] font-mono-nums font-semibold">
                      {wellsAtDepth.length}
                    </span>
                  </div>
                  {wellsAtDepth.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No nearby wells reach this depth.</p>
                  ) : (
                    <div className="space-y-0.5 max-h-28 overflow-y-auto">
                      {wellsAtDepth.map(w => (
                        <div
                          key={w.well_id}
                          className="flex items-center justify-between text-[11px] py-0.5"
                        >
                          <span className="font-semibold truncate">{w.well_id}</span>
                          <span className="text-muted-foreground font-mono-nums">
                            {w.distance_km?.toFixed(1)} km · {Number(w.end_depth_m).toLocaleString()}m TD
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historical Events in Window */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="label-tag text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber" />
                      Historical Events (±{depthWindow}m)
                    </div>
                    <span className="text-[10px] font-mono-nums font-semibold">
                      {eventsInWindow.length}
                    </span>
                  </div>

                  {eventsInWindow.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No historical events within ±{depthWindow} m of current depth.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {eventsInWindow.map(ev => (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="w-full text-left panel-inset p-2 border border-border hover:bg-secondary/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold">{ev.event_type}</span>
                            <span className="text-[10px] font-mono-nums text-amber font-semibold">
                              {ev.diff}m away
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {ev.well_id} · {ev.distance_km?.toFixed(1)} km · {ev.depth_m}m ·{' '}
                            {ev.formation}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {eventsInWindow.length} historical event{eventsInWindow.length === 1 ? '' : 's'}{' '}
                    within ±{depthWindow} m · <span className="tag-proto">PROTOTYPE EVENT</span>
                  </p>
                </div>

                {/* Historical Categories Bar Chart */}
                <div>
                  <div className="label-tag text-muted-foreground mb-1">
                    Historical Context (±{depthWindow}m)
                  </div>
                  {categoriesInWindow.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No event categories in window.</p>
                  ) : (
                    <div className="space-y-1">
                      {categoriesInWindow.map(([type, count]) => (
                        <div key={type} className="flex items-center gap-2">
                          <span className="w-24 text-[10px] text-muted-foreground truncate" title={type}>
                            {type}
                          </span>
                          <div className="flex-1 h-2 rounded-sm bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-sm"
                              style={{
                                width: `${(count / maxCatCount) * 100}%`,
                                background: EVENT_COLORS[type] || 'hsl(var(--amber))'
                              }}
                            />
                          </div>
                          <span className="w-5 text-right text-[10px] font-mono-nums font-semibold">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Historical occurrence only — not validated probability.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto grid grid-cols-3 gap-1.5 pt-2">
                  <button
                    onClick={() => setShowWhy(true)}
                    className="h-9 rounded-md border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    WHY?
                  </button>
                  <button
                    onClick={() => setShowCompare(true)}
                    className="h-9 rounded-md border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                    Compare
                  </button>
                  <button
                    onClick={() => {
                      if (eventsInWindow.length > 0) {
                        setSelectedEvent(eventsInWindow[0]);
                      }
                    }}
                    className="h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Evidence
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Depth Slider bar */}
          <DepthSlider
            maxDepth={maxDepth}
            currentDepth={currentDepth}
            setCurrentDepth={setCurrentDepth}
          />
        </div>
      )}

      {/* Modals */}
      {showWhy && (
        <WhyModal
          currentDepth={currentDepth}
          eventsNear={eventsInWindow}
          depthWindow={depthWindow}
          onClose={() => setShowWhy(false)}
        />
      )}

      {showCompare && (
        <CompareModal
          currentDepth={currentDepth}
          eventsNear={eventsInWindow}
          depthWindow={depthWindow}
          onClose={() => setShowCompare(false)}
        />
      )}

      {selectedEvent && (
        <EvidenceModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};
