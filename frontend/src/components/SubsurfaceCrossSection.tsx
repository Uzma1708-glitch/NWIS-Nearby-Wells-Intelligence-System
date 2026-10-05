import React, { useRef, useMemo, useState } from 'react';
import type { Well, ProposedWell, DrillingEvent } from '../types/nwis';
import { FORMATIONS } from '../services/nwisData';

interface SubsurfaceCrossSectionProps {
  proposedWell: ProposedWell | null;
  nearbyWells: Well[];
  events: DrillingEvent[];
  currentDepth: number;
  setCurrentDepth: (depth: number) => void;
  maxDepth: number;
  depthWindow?: number;
}

interface ClusteredEvent {
  id: string;
  depth_m: number;
  event_type: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  count: number;
  mitigation?: string;
}

export const SubsurfaceCrossSection: React.FC<SubsurfaceCrossSectionProps> = ({
  proposedWell,
  nearbyWells,
  events,
  currentDepth,
  setCurrentDepth,
  maxDepth,
  depthWindow = 30
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<{ event: ClusteredEvent; x: number; y: number } | null>(null);

  // SVG coordinate conversions
  // Chart area: top at y=48, bottom at y=470 (height 422)
  const chartTopY = 48;
  const chartBottomY = 470;
  const chartHeight = chartBottomY - chartTopY;

  const depthToY = (d: number) => chartTopY + (Math.max(0, Math.min(maxDepth, d)) / maxDepth) * chartHeight;
  const yToDepth = (y: number) => {
    const clampedY = Math.max(chartTopY, Math.min(chartBottomY, y));
    return Math.round(((clampedY - chartTopY) / chartHeight) * maxDepth);
  };

  // Select 5-6 representative, distinct offset wells (avoiding identical wells or 0-depth wells)
  const profileWells = useMemo(() => {
    // Priority wells from SIH scenario if present
    const sihPriority = ['X12', 'X09', 'X21', 'X07', 'X15', 'X18'];
    const sihWells = nearbyWells.filter(w => sihPriority.includes(w.well_name || w.well_id));
    const otherWells = nearbyWells
      .filter(w => !sihPriority.includes(w.well_name || w.well_id) && (Number(w.end_depth_m) || 0) > 1000)
      .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));

    const selectedOffsets = [...sihWells, ...otherWells].slice(0, 5);

    // Group into left of active well and right of active well for geological cross-section corridor
    const leftOffsets = selectedOffsets.slice(0, 2);
    const rightOffsets = selectedOffsets.slice(2, 5);

    return {
      left: leftOffsets,
      right: rightOffsets,
      allOffsets: [...leftOffsets, ...rightOffsets]
    };
  }, [nearbyWells]);

  // Clean horizontal spacing for each well track across chart width (x=80 to x=630)
  const startX = 85;
  const endX = 635;
  const availableWidth = endX - startX;

  // Build ordered column list: Left offsets -> Proposed Well (Center) -> Right offsets
  const columns = useMemo(() => {
    const list: Array<{
      key: string;
      isProposed: boolean;
      name: string;
      distanceText: string;
      td: number;
      well?: Well;
    }> = [];

    // Left offsets
    profileWells.left.forEach(w => {
      list.push({
        key: w.well_id,
        isProposed: false,
        name: w.well_name || w.well_id,
        distanceText: `${(w.distance_km ?? 2.5).toFixed(1)} km`,
        td: Number(w.end_depth_m) || 3850,
        well: w
      });
    });

    // Proposed Active Well in Center
    list.push({
      key: proposedWell?.name || 'P-01',
      isProposed: true,
      name: proposedWell?.name || 'P-01',
      distanceText: 'Active Target',
      td: proposedWell?.maxDepth || 3950
    });

    // Right offsets
    profileWells.right.forEach(w => {
      list.push({
        key: w.well_id,
        isProposed: false,
        name: w.well_name || w.well_id,
        distanceText: `${(w.distance_km ?? 3.5).toFixed(1)} km`,
        td: Number(w.end_depth_m) || 3900,
        well: w
      });
    });

    const count = list.length;
    const colStep = availableWidth / count;

    return list.map((col, idx) => ({
      ...col,
      x: Math.round(startX + (idx + 0.5) * colStep)
    }));
  }, [profileWells, proposedWell, availableWidth, startX]);

  // Cluster events per well to eliminate overlapping swarms
  const wellEventsMap = useMemo(() => {
    const map: Record<string, ClusteredEvent[]> = {};

    columns.forEach(col => {
      if (col.isProposed) return;
      const wellId = col.well?.well_id;
      const wellName = col.well?.well_name;

      const raw = events.filter(e => e.well_id === wellId || e.well_name === wellName);
      // Group events that occur within 35m of each other
      const clusters: ClusteredEvent[] = [];

      raw.forEach(e => {
        const existing = clusters.find(c => Math.abs(c.depth_m - e.depth_m) < 35);
        if (existing) {
          existing.count += 1;
          if (e.severity === 'High') existing.severity = 'High';
        } else {
          clusters.push({
            id: e.id,
            depth_m: e.depth_m,
            event_type: e.event_type,
            severity: e.severity,
            description: e.description,
            mitigation: e.mitigation,
            count: 1
          });
        }
      });

      map[col.key] = clusters;
    });

    return map;
  }, [columns, events]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickY = ((e.clientY - rect.top) / rect.height) * 520;
    if (clickY >= chartTopY && clickY <= chartBottomY) {
      const targetDepth = yToDepth(clickY);
      setCurrentDepth(targetDepth);
    }
  };

  const depthTicks = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, maxDepth];

  return (
    <div className="panel p-3 h-full flex flex-col overflow-hidden relative">
      {/* Top Title & Subtitle */}
      <div className="flex items-center justify-between mb-2 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="label-tag text-muted-foreground">Subsurface Cross-Section Correlation</span>
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            {proposedWell?.name || 'P-01'} Well Corridor
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
          <span>Click anywhere to adjust bit depth</span>
          <span className="font-mono-nums font-bold text-critical bg-critical/15 px-2 py-0.5 rounded border border-critical/30">
            {currentDepth} m
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 min-h-0 overflow-x-auto relative">
        <svg
          ref={svgRef}
          viewBox="0 0 840 510"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full min-w-[720px] select-none cursor-pointer"
          onClick={handleSvgClick}
        >
          {/* 1. Formations Background Bands */}
          {FORMATIONS.filter(f => f.top < maxDepth).map(f => {
            const topY = depthToY(Math.max(f.top, 0));
            const bottomY = depthToY(Math.min(f.bottom, maxDepth));
            const height = Math.max(0, bottomY - topY);

            return (
              <g key={f.name}>
                {/* Stratigraphic layer background */}
                <rect
                  x={startX - 15}
                  y={topY}
                  width={availableWidth + 30}
                  height={height}
                  fill={f.color}
                  opacity={0.16}
                />
                {/* Boundary line */}
                <line
                  x1={startX - 15}
                  y1={bottomY}
                  x2={endX + 15}
                  y2={bottomY}
                  stroke="hsl(var(--border))"
                  strokeWidth={0.7}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                {/* Formation Name & Lithology on Right Margin */}
                <text
                  x={endX + 22}
                  y={topY + Math.min(16, height / 2 + 4)}
                  fontSize={9.5}
                  fill="hsl(var(--foreground))"
                  fontWeight={600}
                >
                  {f.name}
                </text>
                {height > 25 && (
                  <text
                    x={endX + 22}
                    y={topY + Math.min(28, height / 2 + 16)}
                    fontSize={8}
                    fill="hsl(var(--muted-foreground))"
                    opacity={0.8}
                  >
                    {f.lithology}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2. Depth Scale Ticks on Left (Y-Axis) */}
          {depthTicks.map(d => (
            <g key={d}>
              <line
                x1={startX - 22}
                y1={depthToY(d)}
                x2={startX - 15}
                y2={depthToY(d)}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
              />
              <text
                x={startX - 26}
                y={depthToY(d) + 3.5}
                fontSize={9}
                fill="hsl(var(--muted-foreground))"
                textAnchor="end"
                className="font-mono-nums"
                fontWeight={d === 0 || d === maxDepth ? 700 : 500}
              >
                {d}m
              </text>
            </g>
          ))}

          {/* 3. Historical Risk Corridor Band (3810 - 3870m) */}
          {maxDepth >= 3810 && (
            <g>
              <rect
                x={startX - 15}
                y={depthToY(3810)}
                width={availableWidth + 30}
                height={Math.max(12, depthToY(3870) - depthToY(3810))}
                fill="hsl(var(--amber))"
                opacity={0.12}
              />
              <line
                x1={startX - 15}
                y1={depthToY(3810)}
                x2={endX + 15}
                y2={depthToY(3810)}
                stroke="hsl(var(--amber))"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <line
                x1={startX - 15}
                y1={depthToY(3870)}
                x2={endX + 15}
                y2={depthToY(3870)}
                stroke="hsl(var(--amber))"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            </g>
          )}

          {/* 4. Well Trajectory Columns with Dedicated Spacing & High-Contrast Headers */}
          {columns.map(col => {
            const wellDepth = Math.min(col.td, maxDepth);
            const isProposed = col.isProposed;
            const wellEvents = wellEventsMap[col.key] || [];

            return (
              <g key={col.key}>
                {/* Column Background Guide */}
                <line
                  x1={col.x}
                  y1={chartTopY}
                  x2={col.x}
                  y2={chartBottomY}
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                  strokeDasharray="2 4"
                  opacity={0.3}
                />

                {/* WELL HEADER PILL AT TOP (y=10 to y=38) - NEVER OVERLAPS */}
                <g>
                  {isProposed ? (
                    // Active Target Well Header (Vibrant Red)
                    <>
                      <rect
                        x={col.x - 44}
                        y={8}
                        width={88}
                        height={24}
                        rx={5}
                        fill="#dc2626"
                        stroke="#b91c1c"
                        strokeWidth={1.5}
                      />
                      <text
                        x={col.x}
                        y={24}
                        fontSize={11}
                        fill="#ffffff"
                        textAnchor="middle"
                        fontWeight={800}
                        letterSpacing="0.03em"
                      >
                        {col.name} ★
                      </text>
                      <text
                        x={col.x}
                        y={42}
                        fontSize={8.5}
                        fill="#ef4444"
                        textAnchor="middle"
                        fontWeight={700}
                      >
                        Target · TD {col.td}m
                      </text>
                    </>
                  ) : (
                    // Offset Well Header (Dark Slate with High-Contrast Text)
                    <>
                      <rect
                        x={col.x - 38}
                        y={8}
                        width={76}
                        height={24}
                        rx={5}
                        fill="hsl(var(--card))"
                        stroke="hsl(var(--border))"
                        strokeWidth={1.2}
                      />
                      <text
                        x={col.x}
                        y={24}
                        fontSize={11}
                        fill="hsl(var(--foreground))"
                        textAnchor="middle"
                        fontWeight={700}
                      >
                        {col.name}
                      </text>
                      <text
                        x={col.x}
                        y={42}
                        fontSize={8.5}
                        fill="hsl(var(--muted-foreground))"
                        textAnchor="middle"
                      >
                        {col.distanceText} · {col.td}m
                      </text>
                    </>
                  )}
                </g>

                {/* Surface Wellhead Symbol */}
                <circle
                  cx={col.x}
                  cy={depthToY(0)}
                  r={3.5}
                  fill={isProposed ? '#ef4444' : 'hsl(var(--muted-foreground))'}
                />

                {/* Trajectory Borehole Line */}
                {isProposed ? (
                  // Proposed well trajectory
                  <>
                    {/* Drilled Section down to currentDepth */}
                    <line
                      x1={col.x}
                      y1={depthToY(0)}
                      x2={col.x}
                      y2={depthToY(currentDepth)}
                      stroke="#ef4444"
                      strokeWidth={2.5}
                    />
                    {/* Casing boundary shadow */}
                    <line
                      x1={col.x - 2}
                      y1={depthToY(0)}
                      x2={col.x - 2}
                      y2={depthToY(Math.min(currentDepth, 3300))}
                      stroke="#f87171"
                      strokeWidth={0.8}
                      opacity={0.6}
                    />
                    <line
                      x1={col.x + 2}
                      y1={depthToY(0)}
                      x2={col.x + 2}
                      y2={depthToY(Math.min(currentDepth, 3300))}
                      stroke="#f87171"
                      strokeWidth={0.8}
                      opacity={0.6}
                    />

                    {/* Planned Section below currentDepth */}
                    {currentDepth < wellDepth && (
                      <line
                        x1={col.x}
                        y1={depthToY(currentDepth)}
                        x2={col.x}
                        y2={depthToY(wellDepth)}
                        stroke="#ef4444"
                        strokeWidth={1.8}
                        strokeDasharray="5 4"
                        opacity={0.7}
                      />
                    )}

                    {/* Active Drill Bit Marker */}
                    <g transform={`translate(${col.x}, ${depthToY(currentDepth)})`}>
                      <circle r={6} fill="#dc2626" opacity={0.3} className="animate-ping" />
                      <circle r={4} fill="#dc2626" stroke="#ffffff" strokeWidth={1.5} />
                      <path d="M -4 4 L 0 8 L 4 4 Z" fill="#dc2626" />
                    </g>
                  </>
                ) : (
                  // Offset Well Trajectory
                  <>
                    <line
                      x1={col.x}
                      y1={depthToY(0)}
                      x2={col.x}
                      y2={depthToY(wellDepth)}
                      stroke="hsl(var(--steel))"
                      strokeWidth={1.8}
                    />
                    {/* Base TD marker */}
                    <circle cx={col.x} cy={depthToY(wellDepth)} r={2.5} fill="hsl(var(--steel))" />
                    <line
                      x1={col.x - 4}
                      y1={depthToY(wellDepth)}
                      x2={col.x + 4}
                      y2={depthToY(wellDepth)}
                      stroke="hsl(var(--steel))"
                      strokeWidth={1.5}
                    />
                  </>
                )}

                {/* Clean, Non-overlapping Event Markers along Well Trajectory */}
                {wellEvents.map(e => {
                  const evY = depthToY(e.depth_m);
                  const isNear = Math.abs(e.depth_m - currentDepth) <= depthWindow;
                  const isSevere = e.severity === 'High';

                  // Determine color based on event type
                  const evType = e.event_type.toLowerCase();
                  const badgeColor = evType.includes('loss')
                    ? '#f59e0b' // Amber for Mud Loss
                    : evType.includes('stuck')
                    ? '#06b6d4' // Cyan for Stuck Pipe
                    : evType.includes('kick')
                    ? '#ef4444' // Red for Kick
                    : '#a855f7'; // Purple for Torque Spike

                  return (
                    <g
                      key={e.id}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredEvent({ event: e, x: col.x, y: evY })}
                      onMouseLeave={() => setHoveredEvent(null)}
                    >
                      {/* Highlight ring if close to current bit depth */}
                      {isNear && (
                        <circle
                          cx={col.x}
                          cy={evY}
                          r={9}
                          fill={badgeColor}
                          opacity={0.25}
                        />
                      )}

                      {/* Main Event Icon Dot */}
                      <circle
                        cx={col.x}
                        cy={evY}
                        r={isNear ? 5.5 : 4}
                        fill={badgeColor}
                        stroke="#ffffff"
                        strokeWidth={1.2}
                      />

                      {/* Severe exclamation or count */}
                      {e.count > 1 ? (
                        <text
                          x={col.x}
                          y={evY + 3}
                          fontSize={7}
                          fill="#ffffff"
                          textAnchor="middle"
                          fontWeight={800}
                        >
                          {e.count}
                        </text>
                      ) : isSevere ? (
                        <text
                          x={col.x}
                          y={evY + 3}
                          fontSize={7}
                          fill="#ffffff"
                          textAnchor="middle"
                          fontWeight={800}
                        >
                          !
                        </text>
                      ) : null}

                      {/* In-situ Callout Badge for Events near Current Depth */}
                      {isNear && (
                        <g transform={`translate(${col.x + 8}, ${evY - 8})`}>
                          <rect
                            x={0}
                            y={0}
                            width={78}
                            height={16}
                            rx={3}
                            fill="hsl(var(--card))"
                            stroke={badgeColor}
                            strokeWidth={1}
                          />
                          <text
                            x={4}
                            y={11}
                            fontSize={7.5}
                            fontWeight={700}
                            fill="hsl(var(--foreground))"
                          >
                            {e.event_type.replace('_', ' ').slice(0, 11)} {e.depth_m}m
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* 5. Active Current Depth Guide Line Across Entire Cross Section */}
          <g>
            <line
              x1={startX - 15}
              y1={depthToY(currentDepth)}
              x2={endX + 15}
              y2={depthToY(currentDepth)}
              stroke="#ef4444"
              strokeWidth={1.8}
            />
            {/* Glowing Depth Badge on Right */}
            <rect
              x={endX + 18}
              y={depthToY(currentDepth) - 10}
              width={78}
              height={20}
              rx={4}
              fill="#ef4444"
            />
            <text
              x={endX + 57}
              y={depthToY(currentDepth) + 4}
              fontSize={10}
              fill="#ffffff"
              textAnchor="middle"
              fontWeight={800}
              className="font-mono-nums"
            >
              {currentDepth} m
            </text>
          </g>
        </svg>

        {/* Hover Popover Tooltip for Events */}
        {hoveredEvent && (
          <div
            className="absolute z-50 bg-popover border border-border text-popover-foreground px-3 py-2 rounded-md shadow-xl text-xs max-w-xs pointer-events-none"
            style={{
              left: Math.min(hoveredEvent.x + 15, 600),
              top: Math.max(hoveredEvent.y - 40, 10)
            }}
          >
            <div className="font-bold text-primary flex items-center justify-between gap-2">
              <span>{hoveredEvent.event.event_type.replace('_', ' ')}</span>
              <span className="font-mono-nums text-[10px] text-muted-foreground">{hoveredEvent.event.depth_m}m</span>
            </div>
            <div className="text-[11px] text-foreground mt-0.5">{hoveredEvent.event.description}</div>
            {hoveredEvent.event.mitigation && (
              <div className="text-[10px] text-emerald-400 mt-1">
                <strong>Mitigation:</strong> {hoveredEvent.event.mitigation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Clean Bottom Legend (Never Overlaps) */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-2 pt-2 border-t border-border px-2 text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <span className="w-4 h-1 bg-critical inline-block rounded-full" />
            {proposedWell?.name || 'P-01'} Active Well
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-steel inline-block rounded-full" />
            Correlated Offset Trajectory
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-amber/20 border border-amber inline-block rounded-sm" />
            Fracture Risk Zone (3810–3870m)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber inline-block" />
            Mud Loss
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
            Stuck Pipe
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            Torque Spike
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-critical inline-block" />
            High Severity / Kick
          </span>
        </div>
      </div>
    </div>
  );
};
