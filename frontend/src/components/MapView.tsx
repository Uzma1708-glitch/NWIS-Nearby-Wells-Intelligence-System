import React, { useEffect, useMemo, useState, useRef } from 'react';
import L from 'leaflet';
import type { Well, ProposedWell } from '../types/nwis';
import type { Well as SihWell, TrajectoryPoint } from '../types/sihDomain';
import { Sliders } from 'lucide-react';

interface MapViewProps {
  wells?: Well[];
  sihWells?: SihWell[];
  trajectories?: TrajectoryPoint[];
  proposedWell?: ProposedWell | null;
  activeWell?: SihWell;
  radiusKm?: number;
  onRadiusChange?: (newRadius: number) => void;
  nearbyWellIds?: string[];
  riskWellIds?: string[];
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  onSelectWell?: (well: Well | SihWell) => void;
  height?: string | number;
}

function createDotIcon(isNearby: boolean, isRisk: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="nwis-well-dot ${isRisk ? 'risk' : isNearby ? 'nearby' : ''}"></div>`,
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5]
  });
}

function createClusterIcon(count: number) {
  return L.divIcon({
    className: '',
    html: `<div class="nwis-cluster">${count}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function createSihWellIcon(wellName: string, isNearby: boolean, relevanceScore?: number, hasRisk?: boolean) {
  const isX12 = wellName === 'X12';
  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 500;">
        <div style="
          width: ${isNearby ? '14px' : '10px'};
          height: ${isNearby ? '14px' : '10px'};
          border-radius: 50%;
          background: ${hasRisk ? '#ef4444' : isNearby ? '#06b6d4' : '#64748b'};
          border: 2px solid ${isX12 ? '#f59e0b' : '#ffffff'};
          box-shadow: 0 0 ${isNearby ? '10px rgba(6,182,212,0.8)' : '4px rgba(0,0,0,0.5)'};
          transition: transform 0.2s;
        "></div>
        <div style="
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid ${isNearby ? '#06b6d4' : 'rgba(255,255,255,0.2)'};
          color: ${isNearby ? '#38bdf8' : '#94a3b8'};
          font-size: 10px;
          font-family: monospace;
          font-weight: bold;
          padding: 1px 4px;
          border-radius: 3px;
          margin-top: 2px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.6);
        ">
          ${wellName} ${relevanceScore ? `<span style="color:#fbbf24;font-size:9px;">${relevanceScore}%</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [60, 32],
    iconAnchor: [30, 7]
  });
}

function createActiveWellIcon(name: string, depth: number) {
  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 1000; cursor: pointer;">
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #f59e0b;
          border: 3px solid #ffffff;
          box-shadow: 0 0 16px rgba(245, 158, 11, 0.9);
          animation: pulse 2s infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 11px;
          color: #000;
        ">
          ★
        </div>
        <div style="
          background: #78350f;
          border: 1px solid #f59e0b;
          color: #fef3c7;
          font-size: 11px;
          font-family: monospace;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 2px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        ">
          ACTIVE: ${name} (${depth}m)
        </div>
      </div>
    `,
    iconSize: [120, 42],
    iconAnchor: [60, 11]
  });
}

export const MapView: React.FC<MapViewProps> = ({
  wells = [],
  sihWells = [],
  trajectories = [],
  proposedWell,
  activeWell,
  radiusKm = 5.0,
  onRadiusChange,
  nearbyWellIds = [],
  riskWellIds = [],
  onMapClick,
  onSelectWell,
  height = '100%'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const proposedLayerRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerRef = useRef<L.LayerGroup | null>(null);

  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [zoom, setZoom] = useState<number>(11);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on active well, proposed well, or default
    const initialCenter: [number, number] = activeWell
      ? [activeWell.latitude, activeWell.longitude]
      : proposedWell
      ? [proposedWell.lat, proposedWell.lng]
      : [52.215, 6.815];
    const initialZoom = 11;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 5,
      maxZoom: 16,
      scrollWheelZoom: true,
      zoomControl: true
    });

    // Dark industrial basemap (no watermark, no API key required)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri, &copy; OpenStreetMap contributors',
        maxZoom: 16
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    ).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const proposedGroup = L.layerGroup().addTo(map);
    const trajectoryGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    proposedLayerRef.current = proposedGroup;
    trajectoryLayerRef.current = trajectoryGroup;
    mapRef.current = map;

    const updateState = () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    };

    map.on('moveend', updateState);
    map.on('zoomend', updateState);
    updateState();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  // FlyTo when active well or proposed well changes
  useEffect(() => {
    const map = mapRef.current;
    const lat = activeWell?.latitude ?? proposedWell?.lat;
    const lng = activeWell?.longitude ?? proposedWell?.lng;
    if (!map || lat === undefined || lng === undefined) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 11), {
      duration: 0.8
    });
  }, [activeWell?.latitude, activeWell?.longitude, proposedWell?.lat, proposedWell?.lng]);

  // Recalculate and draw radius circle and Active Well marker
  useEffect(() => {
    const group = proposedLayerRef.current;
    if (!group) return;
    group.clearLayers();

    const activeLat = activeWell?.latitude ?? proposedWell?.lat ?? 52.215;
    const activeLng = activeWell?.longitude ?? proposedWell?.lng ?? 6.815;
    const activeName = activeWell?.well_name ?? proposedWell?.name ?? 'X17';
    const activeDepth = activeWell?.current_depth ?? 3842;
    const activeFm = activeWell?.formation_name ?? 'F3';

    // User-defined Radius Circle
    const circle = L.circle([activeLat, activeLng], {
      radius: radiusKm * 1000,
      color: '#06b6d4',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#06b6d4',
      fillOpacity: 0.08
    });
    group.addLayer(circle);

    // Active Well Marker
    const marker = L.marker([activeLat, activeLng], {
      icon: createActiveWellIcon(activeName, activeDepth),
      zIndexOffset: 1200
    });

    marker.bindPopup(`
      <div style="font-family: var(--font-body), sans-serif; font-size: 12px; color: hsl(var(--card-foreground)); padding: 4px; min-width: 190px;">
        <div style="font-weight: bold; color: #d97706; font-size: 13px; margin-bottom: 2px;">ACTIVE TARGET: ${activeName}</div>
        <div style="font-size: 11px; margin-bottom: 2px;"><span style="opacity: 0.7;">Current Depth:</span> <strong>${activeDepth} m MD</strong></div>
        <div style="font-size: 11px; margin-bottom: 2px;"><span style="opacity: 0.7;">Target Formation:</span> <strong style="color: #0284c7;">${activeFm}</strong></div>
        <div style="font-size: 11px; margin-bottom: 2px;"><span style="opacity: 0.7;">Offset Radius:</span> <strong>${radiusKm} km</strong></div>
        <div style="margin-top: 6px; padding: 4px 6px; background: rgba(245, 158, 11, 0.15); border: 1px solid #d97706; border-radius: 4px; font-size: 10px; color: hsl(var(--foreground)); font-weight: 500;">
          STATUS: Drilling active at ${activeDepth}m MD. Offset surveillance within ${radiusKm}km.
        </div>
      </div>
    `);

    group.addLayer(marker);
  }, [activeWell, proposedWell, radiusKm]);

  // Render Trajectories
  useEffect(() => {
    const trajGroup = trajectoryLayerRef.current;
    if (!trajGroup || !trajectories || trajectories.length === 0) return;
    trajGroup.clearLayers();

    // Group trajectories by well_name
    const wellMap: Record<string, TrajectoryPoint[]> = {};
    trajectories.forEach(t => {
      (wellMap[t.well_name] ||= []).push(t);
    });

    Object.entries(wellMap).forEach(([wellName, points]) => {
      points.sort((a, b) => a.measured_depth - b.measured_depth);
      const latlngs: [number, number][] = points.map(p => [p.latitude, p.longitude]);

      const isX17 = wellName === 'X17';
      const isX12 = wellName === 'X12';

      const polyline = L.polyline(latlngs, {
        color: isX17 ? '#f59e0b' : isX12 ? '#06b6d4' : '#64748b',
        weight: isX17 ? 3.5 : isX12 ? 2.5 : 1.5,
        opacity: 0.8,
        dashArray: isX17 ? undefined : '4, 4'
      });

      polyline.bindTooltip(`Trajectory: ${wellName}`, { sticky: true });
      trajGroup.addLayer(polyline);
    });
  }, [trajectories]);

  // Cluster or plot markers from the full well dataset based on viewport bounds and zoom
  const { markers, clusters } = useMemo(() => {
    if (!bounds || !wells.length) return { markers: [], clusters: [] };

    const visibleWells = wells.filter(
      w =>
        w.latitude >= bounds.getSouth() &&
        w.latitude <= bounds.getNorth() &&
        w.longitude >= bounds.getWest() &&
        w.longitude <= bounds.getEast()
    );

    if (zoom >= 11 || visibleWells.length <= 400) {
      return { markers: visibleWells, clusters: [] };
    }

    const gridSize = zoom < 8 ? 0.5 : zoom < 10 ? 0.1 : 0.03;
    const grid: Record<string, Well[]> = {};

    visibleWells.forEach(w => {
      const key = `${Math.round(w.latitude / gridSize) * gridSize}|${Math.round(w.longitude / gridSize) * gridSize}`;
      (grid[key] ||= []).push(w);
    });

    return {
      markers: [],
      clusters: Object.values(grid).map(items => ({
        lat: items.reduce((sum, w) => sum + w.latitude, 0) / items.length,
        lng: items.reduce((sum, w) => sum + w.longitude, 0) / items.length,
        count: items.length
      }))
    };
  }, [wells, bounds, zoom]);

  // Dynamically compute nearbySet based on distance to activeWell / proposedWell
  const nearbySet = useMemo(() => {
    const set = new Set<string>(nearbyWellIds);
    const activeLat = activeWell?.latitude ?? proposedWell?.lat ?? 52.215;
    const activeLng = activeWell?.longitude ?? proposedWell?.lng ?? 6.815;

    wells.forEach(w => {
      const dist = L.latLng(activeLat, activeLng).distanceTo(L.latLng(w.latitude, w.longitude)) / 1000;
      if (dist <= radiusKm) {
        set.add(w.well_id);
        if (w.id) set.add(String(w.id));
      }
    });

    return set;
  }, [wells, activeWell, proposedWell, radiusKm, nearbyWellIds]);

  const riskSet = useMemo(() => {
    const set = new Set<string>(riskWellIds);
    sihWells.forEach(sw => {
      if (sw.relevance_score && sw.relevance_score >= 80) {
        set.add(sw.well_name);
        set.add(String(sw.id));
      }
    });
    return set;
  }, [riskWellIds, sihWells]);

  // Render well markers & clusters
  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;
    group.clearLayers();

    const activeName = activeWell?.well_name ?? proposedWell?.name ?? 'X17';
    const sihWellNameMap = new Map<string, SihWell>();
    sihWells.forEach(sw => sihWellNameMap.set(sw.well_name, sw));

    // Render clusters
    clusters.forEach(c => {
      const m = L.marker([c.lat, c.lng], { icon: createClusterIcon(c.count) });
      group.addLayer(m);
    });

    // Render individual well markers
    markers.forEach(w => {
      // Don't render active well as a background dot
      if (w.well_name === activeName || (proposedWell && w.well_name === proposedWell.name)) return;

      const isNearby = nearbySet.has(w.well_id) || nearbySet.has(String(w.id));
      const isRisk = riskSet.has(w.well_id) || riskSet.has(String(w.id));
      const sihMatch = sihWellNameMap.get(w.well_name);

      let m: L.Marker;

      if (sihMatch) {
        // High-importance SIH demonstration offset well
        m = L.marker([w.latitude, w.longitude], {
          icon: createSihWellIcon(sihMatch.well_name, isNearby, sihMatch.relevance_score, isRisk),
          zIndexOffset: isNearby ? 300 : 100
        });
      } else {
        // Standard historical well dot (blue if nearby, red if risk, steel otherwise)
        m = L.marker([w.latitude, w.longitude], {
          icon: createDotIcon(isNearby, isRisk),
          zIndexOffset: isNearby ? 200 : 50
        });
      }

      const popupContent = `
        <div style="font-family: var(--font-body), sans-serif; font-size: 12px; color: hsl(var(--card-foreground)); padding: 4px; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-weight: bold; font-size: 13px; color: ${isNearby ? '#0284c7' : 'inherit'};">${w.well_name || w.well_id}</span>
            <span style="background: ${isNearby ? '#0284c7' : 'hsl(var(--secondary))'}; color: ${isNearby ? '#ffffff' : 'inherit'}; font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: bold;">
              ${isNearby ? 'NEARBY' : 'REGIONAL'}
            </span>
          </div>
          <div style="font-size: 11px; margin-bottom: 6px; display: flex; flex-direction: column; gap: 2px;">
            <div><span style="opacity: 0.7;">Field:</span> <strong>${w.field_name || 'Dutch Basin'}</strong></div>
            <div><span style="opacity: 0.7;">Status:</span> <strong>${w.status || 'COMPLETED'}</strong></div>
            <div><span style="opacity: 0.7;">TD:</span> <strong>${w.end_depth_m ? `${w.end_depth_m} m MD` : '—'}</strong></div>
            ${sihMatch?.relevance_score ? `<div><span style="opacity: 0.7;">Relevance:</span> <strong style="color: #059669;">${sihMatch.relevance_score}%</strong></div>` : ''}
          </div>
          ${isRisk ? `
            <div style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); border-radius: 3px; padding: 4px 6px; margin-bottom: 6px; font-size: 10px; color: #dc2626; font-weight: 600;">
              ⚠ Historical Offset Hazard Documented
            </div>
          ` : ''}
          <div style="display: flex; gap: 4px; margin-top: 4px;">
            <button id="btn-select-target-${w.well_name || w.well_id}" style="
              flex: 1;
              background: #d97706;
              color: white;
              border: none;
              padding: 5px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 700;
              cursor: pointer;
            ">
              ★ Set Target
            </button>
            <button id="btn-open-well-${w.well_name || w.well_id}" style="
              flex: 1;
              background: #0284c7;
              color: white;
              border: none;
              padding: 5px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
              cursor: pointer;
            ">
              Inspect &rarr;
            </button>
          </div>
        </div>
      `;

      m.bindPopup(popupContent);
      m.on('popupopen', () => {
        const btnSelect = document.getElementById(`btn-select-target-${w.well_name || w.well_id}`);
        if (btnSelect && onSelectWell) {
          btnSelect.onclick = () => onSelectWell(sihMatch || w);
        }
        const btnOpen = document.getElementById(`btn-open-well-${w.well_name || w.well_id}`);
        if (btnOpen && onSelectWell) {
          btnOpen.onclick = () => onSelectWell(sihMatch || w);
        }
      });

      if (onSelectWell) {
        m.on('click', () => onSelectWell(sihMatch || w));
      }

      group.addLayer(m);
    });
  }, [markers, clusters, nearbySet, riskSet, sihWells, activeWell, proposedWell, onSelectWell]);

  const activeName = activeWell?.well_name ?? proposedWell?.name ?? 'X17';
  const activeDepth = activeWell?.current_depth ?? 3842;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="relative z-0" />

      {/* Floating Radius and Legend Overlay */}
      <div className="absolute top-3 right-3 z-10 panel p-2.5 shadow-xl text-xs space-y-2 bg-card/90 backdrop-blur border border-border max-w-[220px]">
        <div className="flex items-center justify-between font-semibold border-b border-border pb-1">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-primary" />
            Offset Radius
          </span>
          <span className="font-mono text-primary font-bold">{radiusKm} km</span>
        </div>

        {onRadiusChange && (
          <div className="space-y-1">
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={radiusKm}
              onChange={e => onRadiusChange(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer h-1.5 bg-secondary rounded"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <button onClick={() => onRadiusChange(2)} className="hover:text-foreground cursor-pointer">2km</button>
              <button onClick={() => onRadiusChange(5)} className="text-primary font-bold cursor-pointer">5km</button>
              <button onClick={() => onRadiusChange(10)} className="hover:text-foreground cursor-pointer">10km</button>
              <button onClick={() => onRadiusChange(20)} className="hover:text-foreground cursor-pointer">20km</button>
            </div>
          </div>
        )}

        <div className="pt-1.5 border-t border-border space-y-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
            <span>Active Target ({activeName} @ {activeDepth}m MD)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>Nearby Offset Dots (&le; {radiusKm}km)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Documented Hazard Dots</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>Regional Well Dots / Clusters</span>
          </div>
        </div>
      </div>
    </div>
  );
};
