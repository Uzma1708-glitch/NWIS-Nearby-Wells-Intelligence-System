import React from 'react';
import { Search, Sparkles, FileText, Sun, Moon, Radio, Building2, UploadCloud } from 'lucide-react';
import { useNwis, useTheme } from '../context/NwisContext';

interface HeaderProps {
  onSearch: () => void;
  onAskNwis: () => void;
  onBrief: () => void;
  onOpenDocModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, onAskNwis, onBrief, onOpenDocModal }) => {
  const { theme, toggle } = useTheme();
  const {
    currentDepth,
    setCurrentDepth,
    sihRadius,
    setSihRadius,
    lookaheadDistance,
    setLookaheadDistance,
    viewMode,
    setViewMode,
    sihState,
    activeWell,
    setActiveWell,
    proposedWell,
    wells
  } = useNwis();

  // Dynamic list of all available active, proposed, and offset wells
  const availableWells = React.useMemo(() => {
    const list: Array<{ id: string | number; name: string; label: string }> = [];
    const seen = new Set<string>();

    // 1. Proposed Target Well (e.g. P-01) if defined
    if (proposedWell && proposedWell.name) {
      const pName = proposedWell.name;
      list.push({
        id: pName,
        name: pName,
        label: `${pName} ★ (Target Well)`
      });
      seen.add(pName.toUpperCase());
    }

    // 2. SIH demonstration wells
    sihState.wells.forEach(w => {
      const key = w.well_name.toUpperCase();
      if (!seen.has(key)) {
        list.push({
          id: w.id,
          name: w.well_name,
          label: `${w.well_name} ${w.well_name === 'X17' ? '★ (Demo Reference)' : `(${w.formation_name || 'F3'})`}`
        });
        seen.add(key);
      }
    });

    // 3. Regional / Background wells from `wells`
    wells.forEach(w => {
      const name = w.well_name || w.well_id;
      if (name && !seen.has(name.toUpperCase())) {
        list.push({
          id: w.id || name,
          name: name,
          label: `${name} (${w.field_name || 'Dutch Basin'})`
        });
        seen.add(name.toUpperCase());
      }
    });

    return list;
  }, [proposedWell, sihState.wells, wells]);

  const StatItem = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div className="flex flex-col leading-tight">
      <span className="label-tag text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold font-mono-nums ${accent || ''}`}>{value}</span>
    </div>
  );

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card/90 backdrop-blur flex items-center px-4 gap-3 z-20">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-primary text-primary-foreground grid place-items-center font-bold text-xs shadow-sm">
          N
        </div>
        <div className="leading-none">
          <div className="font-display font-bold tracking-tight text-sm flex items-center gap-1.5">
            <span>NWIS</span>
            <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1 py-0.2 rounded font-mono">
              SIH 26121
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground tracking-wide">Nearby Wells Intelligence</div>
        </div>
      </div>

      <div className="h-7 w-px bg-border mx-1" />

      {/* Operational Active Well Context — Fully Interactive Controls */}
      <div className="flex items-center gap-3">
        {/* Active Well Selector (Req 2 & Part 1 R2) */}
        <div className="flex flex-col leading-tight">
          <span className="label-tag text-muted-foreground">Target Active Well</span>
          <select
            value={activeWell.well_name}
            onChange={e => setActiveWell(e.target.value)}
            className="bg-secondary/90 text-amber-700 dark:text-amber-400 font-bold font-mono text-xs px-2 py-1 rounded border border-amber-500/40 cursor-pointer hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-amber-400"
            title="Target active well controls all downstream calculations"
          >
            {availableWells.map(w => (
              <option key={w.name} value={w.name} className="bg-card text-foreground font-normal">
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <StatItem
          label="Target Zone"
          value={`${activeWell.formation_name || 'F3'} (${activeWell.reservoir_name || 'R-Beta'})`}
          accent="text-cyan-700 dark:text-cyan-400"
        />
        <StatItem label="Bit Depth" value={`${currentDepth} m MD`} accent="text-foreground" />

        {/* Dynamic Radius Selector */}
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="label-tag text-muted-foreground">Offset Radius</span>
          <select
            value={sihRadius}
            onChange={e => setSihRadius(Number(e.target.value))}
            className="bg-secondary/80 text-foreground font-semibold font-mono text-xs px-1.5 py-1 rounded border border-border cursor-pointer hover:bg-secondary"
            title="Configure offset search radius"
          >
            {[1, 2, 3, 5, 8, 10, 15, 20].map(r => (
              <option key={r} value={r} className="bg-card text-foreground">
                {r} km
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Look-Ahead Window */}
        <div className="hidden md:flex flex-col leading-tight">
          <span className="label-tag text-muted-foreground">Look-Ahead</span>
          <select
            value={lookaheadDistance}
            onChange={e => setLookaheadDistance(Number(e.target.value))}
            className="bg-secondary/80 text-primary font-semibold font-mono text-xs px-1.5 py-1 rounded border border-primary/30 cursor-pointer hover:bg-secondary"
            title="Configure look-ahead interval"
          >
            {[50, 100, 150, 200, 300, 500].map(d => (
              <option key={d} value={d} className="bg-card text-foreground">
                +{d}m MD
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Depth Progression Controller */}
      <div className="hidden xl:flex items-center gap-1 bg-secondary/80 p-1 rounded-md border border-border text-xs">
        <span className="text-[10px] text-muted-foreground px-1.5 font-medium">Depth:</span>
        {[3790, 3810, 3830, 3842, 3860].map(d => (
          <button
            key={d}
            onClick={() => setCurrentDepth(d)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
              currentDepth === d
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            {d}m
          </button>
        ))}
      </div>

      {/* Field / Office Experience Switcher (Req 16) */}
      <div className="ml-auto flex items-center bg-secondary/80 p-0.5 rounded-md border border-border">
        <button
          onClick={() => setViewMode('field')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
            viewMode === 'field'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Field View: Active well, current telemetry, critical alerts, and instant recommendations"
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Field View</span>
        </button>

        <button
          onClick={() => setViewMode('office')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
            viewMode === 'office'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Office / Analysis View: Cross-well correlation, knowledge repository, documents, and parameter analysis"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Office View</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        {onOpenDocModal && (
          <button
            onClick={onOpenDocModal}
            className="h-8.5 px-2.5 rounded-md border border-border bg-card hover:bg-secondary text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Document Intelligence: Extract & review DDR/WCR reports"
          >
            <UploadCloud className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline">Extract Doc</span>
          </button>
        )}

        <button
          onClick={onSearch}
          className="h-8.5 px-2 rounded-md border border-border bg-card hover:bg-secondary text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Search wells, formations, events"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search</span>
        </button>

        <button
          onClick={onAskNwis}
          className="h-8.5 px-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs font-medium"
          title="Ask Grounded NWIS Copilot"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Copilot</span>
        </button>

        <button
          onClick={onBrief}
          className="h-8.5 px-2 rounded-md border border-border bg-card hover:bg-secondary text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title="View Intelligence Brief / Reports"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reports</span>
        </button>

        <button
          onClick={toggle}
          className="h-8.5 w-8.5 rounded-md border border-border bg-card hover:bg-secondary grid place-items-center transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
