import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useNwis } from '../context/NwisContext';
import { FORMATIONS, EVENT_TYPES, generateWellEvents } from '../services/nwisData';
import type { Well, Formation, DrillingEvent } from '../types/nwis';

interface SearchModalProps {
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ onClose }) => {
  const { wells, nearbyWells, proposedWell, setCurrentDepth, setActiveTab } = useNwis();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const q = query.toLowerCase().trim();

  const results = useMemo(() => {
    if (q.length < 2) {
      return { wells: [], events: [], formations: [], types: [] };
    }

    const matchedWells = wells
      .filter(w => `${w.well_id} ${w.well_name} ${w.field_name || ''}`.toLowerCase().includes(q))
      .slice(0, 12);

    const allNearbyEvents = nearbyWells.flatMap(w => generateWellEvents(w));
    const matchedEvents = allNearbyEvents
      .filter(e =>
        `${e.event_type} ${e.description} ${e.well_id} ${e.formation}`.toLowerCase().includes(q)
      )
      .slice(0, 10);

    const matchedFormations = FORMATIONS.filter(f => f.name.toLowerCase().includes(q));
    const matchedTypes = EVENT_TYPES.filter(t => t.toLowerCase().includes(q));

    return {
      wells: matchedWells,
      events: matchedEvents,
      formations: matchedFormations,
      types: matchedTypes
    };
  }, [q, wells, nearbyWells]);

  const handleSelectWell = (w: Well) => {
    if (proposedWell) {
      setCurrentDepth(Math.round((Number(w.end_depth_m) || 2000) * 0.7));
      setActiveTab('overview');
      navigate('/workspace');
    }
    onClose();
  };

  const handleSelectFormation = (f: Formation) => {
    setCurrentDepth(Math.round((f.top + f.bottom) / 2));
    setActiveTab('subsurface');
    navigate('/workspace');
    onClose();
  };

  const handleSelectEvent = (e: DrillingEvent) => {
    setCurrentDepth(e.depth_m);
    setActiveTab('history');
    navigate('/workspace');
    onClose();
  };

  const handleSelectType = () => {
    setActiveTab('risk');
    navigate('/workspace');
    onClose();
  };

  const hasNoResults =
    results.wells.length === 0 &&
    results.events.length === 0 &&
    results.formations.length === 0 &&
    results.types.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl animate-slide-up overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search wells, fields, formations, events, risk types…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.length < 2 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Search across well names, IDs, fields, formations, events and risk types.
            </div>
          ) : hasNoResults ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No search results for “{query}”.
            </div>
          ) : (
            <div className="space-y-3 p-2">
              {results.wells.length > 0 && (
                <div>
                  <div className="label-tag text-muted-foreground mb-1">Wells</div>
                  {results.wells.map(w => (
                    <button
                      key={w.well_id}
                      onClick={() => handleSelectWell(w)}
                      className="w-full text-left p-2 rounded-md hover:bg-secondary flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="text-sm">
                        <span className="font-semibold">{w.well_name}</span>{' '}
                        <span className="text-muted-foreground text-xs">{w.well_id}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{w.field_name || '—'}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.formations.length > 0 && (
                <div>
                  <div className="label-tag text-muted-foreground mb-1">Formations</div>
                  {results.formations.map(f => (
                    <button
                      key={f.name}
                      onClick={() => handleSelectFormation(f)}
                      className="w-full text-left p-2 rounded-md hover:bg-secondary flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-semibold">{f.name}</span>
                      <span className="text-xs font-mono-nums text-muted-foreground">
                        {f.top}–{f.bottom} m
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.types.length > 0 && (
                <div>
                  <div className="label-tag text-muted-foreground mb-1">Risk Types</div>
                  {results.types.map(t => (
                    <button
                      key={t}
                      onClick={handleSelectType}
                      className="w-full text-left p-2 rounded-md hover:bg-secondary text-sm font-semibold cursor-pointer transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {results.events.length > 0 && (
                <div>
                  <div className="label-tag text-muted-foreground mb-1">Historical Events</div>
                  {results.events.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => handleSelectEvent(ev)}
                      className="w-full text-left p-2 rounded-md hover:bg-secondary cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          {ev.well_id} · {ev.event_type}
                        </span>
                        <span className="text-xs font-mono-nums text-muted-foreground">
                          {ev.depth_m} m
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {ev.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
