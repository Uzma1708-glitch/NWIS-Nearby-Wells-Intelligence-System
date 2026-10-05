import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, Play, Loader2, ShieldCheck } from 'lucide-react';
import { useNwis } from '../context/NwisContext';
import { MapView } from '../components/MapView';
import { SEARCH_RADII } from '../services/nwisData';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    wells,
    loading,
    setProposedWell,
    searchRadius,
    setSearchRadius,
    startDemo,
    sihState
  } = useNwis();

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    setSelectedCoords({ lat: latlng.lat, lng: latlng.lng });
  };

  const handleProceed = () => {
    if (selectedCoords) {
      setProposedWell({ ...selectedCoords, name: 'P-01' });
    }
    navigate('/workspace');
  };

  const handleStartDemo = () => {
    startDemo();
    navigate('/workspace');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Top Header */}
      <div className="h-14 shrink-0 border-b border-border bg-card flex items-center px-4 gap-2">
        <div className="w-7 h-7 rounded bg-primary text-primary-foreground grid place-items-center font-bold text-xs">
          N
        </div>
        <div className="font-display font-bold tracking-tight">NWIS</div>
        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
          Nearby Wells Intelligence System · SIH PS 26121
        </span>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-0">
        {/* Left Information & Selection Panel */}
        <div className="flex flex-col justify-center px-8 lg:px-14 py-8 border-r border-border bg-card overflow-y-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="tag-nlog w-fit">
              SIH PS 26121 PROTOTYPE
            </span>
            <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              ACTIVE WELL: X17 (3842m)
            </span>
          </div>

          <h1 className="font-display font-bold tracking-tight text-3xl lg:text-[2.6rem] leading-[1.1] mt-5">
            Turn historical drilling knowledge
            <br />
            into contextual drilling intelligence.
          </h1>

          <p className="text-muted-foreground mt-4 max-w-md text-sm leading-relaxed">
            NWIS brings fragmented nearby-well knowledge — offset records, operational events, formation correlation, and documented mitigations — together around your active well situation.
          </p>

          <div className="mt-8 panel p-5 max-w-md shadow-sm space-y-4">
            {/* Primary Action Button */}
            <button
              onClick={handleStartDemo}
              disabled={loading}
              className="w-full h-11 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch NWIS Workspace (Active Well X17)</span>
            </button>

            <div className="pt-2 border-t border-border">
              <div className="label-tag text-muted-foreground mb-2">Or select a custom location on map</div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-mono">
                  {selectedCoords
                    ? `${selectedCoords.lat.toFixed(4)}° N, ${selectedCoords.lng.toFixed(4)}° E`
                    : 'Click map to place coordinates'}
                </span>
              </div>

              <div className="mt-3">
                <div className="label-tag text-muted-foreground mb-1.5">Search Radius</div>
                <div className="flex gap-1.5">
                  {SEARCH_RADII.map(r => (
                    <button
                      key={r}
                      onClick={() => setSearchRadius(r)}
                      className={`flex-1 h-7.5 rounded border text-xs font-semibold cursor-pointer transition-colors ${
                        searchRadius === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:bg-secondary text-muted-foreground'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              {selectedCoords && (
                <button
                  onClick={handleProceed}
                  className="mt-3 w-full h-8.5 rounded border border-border bg-secondary text-foreground hover:bg-card text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  Proceed with Selected Coordinates <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-5 max-w-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Frontend prototype with structured local synthetic data. Zero external database required.</span>
          </div>
        </div>

        {/* Right Map View */}
        <div className="relative min-h-[300px] lg:min-h-0">
          {loading && (
            <div className="absolute inset-0 z-[1000] bg-card/60 backdrop-blur-xs grid place-items-center">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Loading NWIS well dataset…
              </div>
            </div>
          )}

          <MapView
            wells={wells}
            sihWells={sihState.wells}
            trajectories={sihState.trajectories}
            proposedWell={selectedCoords ? { ...selectedCoords, name: 'P-01' } : { lat: 52.215, lng: 6.815, name: 'X17' }}
            radiusKm={searchRadius}
            onRadiusChange={setSearchRadius}
            onMapClick={handleMapClick}
            height="100%"
          />

          <div className="absolute bottom-3 left-3 z-[500] panel px-3 py-1.5 text-[11px] text-muted-foreground pointer-events-none shadow-md">
            Active: X17 (3842m) · 12 Offset Wells · {searchRadius}km radius
          </div>
        </div>
      </div>
    </div>
  );
};
