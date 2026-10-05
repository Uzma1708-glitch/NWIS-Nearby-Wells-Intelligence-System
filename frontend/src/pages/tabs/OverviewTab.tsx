import React, { useMemo } from 'react';
import { MapPin, Navigation, Compass, Layers } from 'lucide-react';
import { useNwis } from '../../context/NwisContext';
import { MapView } from '../../components/MapView';
import { WellCard } from '../../components/WellCard';
import { RiskFingerprintChart } from '../../components/RiskFingerprintChart';
import { generateWellEvents } from '../../services/nwisData';

export const OverviewTab: React.FC = () => {
  const {
    wells,
    proposedWell,
    searchRadius,
    nearbyWells,
    events,
    riskZones,
    currentDepth,
    selectedWellIds,
    toggleSelectedWell,
    setActiveTab,
    setActiveWell
  } = useNwis();

  const nearbyWellIds = useMemo(() => nearbyWells.map(w => w.well_id), [nearbyWells]);
  const riskWellIds = useMemo(() => [...new Set(riskZones.flatMap(z => z.wells))], [riskZones]);

  const maxTD = useMemo(() => {
    const depths = nearbyWells.map(w => Number(w.end_depth_m) || 0);
    return Math.min(3600, Math.max(2500, ...depths));
  }, [nearbyWells]);

  const stats = [
    { label: 'Proposed Well', value: proposedWell?.name || '—', icon: MapPin },
    { label: 'Search Radius', value: `${searchRadius} km`, icon: Navigation },
    { label: 'Nearby Wells', value: nearbyWells.length.toString(), icon: Compass },
    { label: 'Max TD (nearby)', value: `${Math.round(maxTD)} m`, icon: Layers }
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Stat metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="panel p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="label-tag">{s.label}</span>
                  </div>
                  <div className="text-xl font-bold font-mono-nums mt-1">{s.value}</div>
                </div>
              );
            })}
          </div>

          {/* Interactive Map */}
          <div className="panel p-1 h-[46vh] overflow-hidden">
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

          {/* Proposed Well Summary Card */}
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="label-tag text-muted-foreground">Proposed Well · {proposedWell?.name || 'P-01'}</span>
              <span className="tag-proto">PROPOSED</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                Latitude:{' '}
                <span className="font-mono-nums font-semibold">
                  {proposedWell?.lat.toFixed(5)}
                </span>
              </div>
              <div>
                Longitude:{' '}
                <span className="font-mono-nums font-semibold">
                  {proposedWell?.lng.toFixed(5)}
                </span>
              </div>
              <div>
                Current depth:{' '}
                <span className="font-mono-nums font-semibold">{currentDepth} m</span>
              </div>
              <div>
                Nearby events:{' '}
                <span className="font-mono-nums font-semibold">{events.length}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('subsurface')}
              className="mt-3 text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              Open Subsurface interpretation →
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <RiskFingerprintChart events={events} />

          {/* Nearby Wells Card */}
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="label-tag text-muted-foreground">
                Nearby Wells ({nearbyWells.length})
              </span>
              <span className="tag-nlog">NLOG SOURCE</span>
            </div>

            {nearbyWells.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No NLOG wells found within {searchRadius} km of {proposedWell?.name || 'P-01'}. Increase the search radius.
              </p>
            ) : (
              <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                {nearbyWells.slice(0, 60).map(w => (
                  <WellCard
                    key={w.well_id}
                    well={w}
                    distanceKm={w.distance_km}
                    eventCount={generateWellEvents(w).length}
                    selected={selectedWellIds.includes(w.well_id)}
                    onToggleSelect={toggleSelectedWell}
                    compact={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
