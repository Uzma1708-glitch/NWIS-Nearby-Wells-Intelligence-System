import React, { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  AlertTriangle,
  BookOpen,
  ShieldCheck,
  Layers,
  ExternalLink,
  Database
} from 'lucide-react';
import { useNwis } from '../context/NwisContext';

type CategoryTab = 'all' | 'events' | 'lessons' | 'mitigations' | 'risk_intervals';

interface KnowledgeRepositoryViewProps {
  onSelectWell?: (wellName: string) => void;
  onOpenDocModal?: () => void;
}

export const KnowledgeRepositoryView: React.FC<KnowledgeRepositoryViewProps> = ({
  onSelectWell,
  onOpenDocModal
}) => {
  const { sihState } = useNwis();
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWell, setSelectedWell] = useState<string>('ALL');
  const [selectedFormation, setSelectedFormation] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  // Filter events
  const filteredEvents = useMemo(() => {
    return sihState.events.filter(ev => {
      if (selectedWell !== 'ALL' && ev.well_name !== selectedWell) return false;
      if (selectedFormation !== 'ALL' && (ev.formation_name || '') !== selectedFormation) return false;
      if (selectedSeverity !== 'ALL' && ev.severity !== selectedSeverity) return false;
      if (selectedEventType !== 'ALL' && ev.event_type !== selectedEventType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          ev.well_name.toLowerCase().includes(q) ||
          ev.event_type.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          (ev.mitigation && ev.mitigation.toLowerCase().includes(q)) ||
          (ev.lessons_learned && ev.lessons_learned.toLowerCase().includes(q)) ||
          (ev.formation_name && ev.formation_name.toLowerCase().includes(q)) ||
          String(ev.depth).includes(q) ||
          (ev.source_doc && ev.source_doc.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [sihState.events, selectedWell, selectedFormation, selectedSeverity, selectedEventType, searchQuery]);

  // Filter risk intervals
  const filteredRiskIntervals = useMemo(() => {
    return sihState.riskIntervals.filter(ri => {
      const fmName = ri.formation_name || '';
      if (selectedFormation !== 'ALL' && fmName !== selectedFormation) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = ri.description || ri.evidence || '';
        const mit = ri.recommended_mitigation || '';
        return (
          ri.risk_type.toLowerCase().includes(q) ||
          fmName.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q) ||
          mit.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sihState.riskIntervals, selectedFormation, searchQuery]);

  return (
    <div className="panel p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Structured Knowledge Repository</h2>
            <span className="badge-primary text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
              SYNTHETIC DATA — PROTOTYPE
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified historical offset intelligence, lessons learned, and validated mitigation procedures with complete source document traceability.
          </p>
        </div>

        {onOpenDocModal && (
          <button
            onClick={onOpenDocModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <FileText className="w-3.5 h-3.5" />
            Extract Document (OCR/NLP)
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-border">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeCategory === 'all'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          All Intelligence ({filteredEvents.length + filteredRiskIntervals.length})
        </button>
        <button
          onClick={() => setActiveCategory('events')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeCategory === 'events'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Operational Events ({filteredEvents.length})
        </button>
        <button
          onClick={() => setActiveCategory('lessons')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeCategory === 'lessons'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Lessons Learned ({filteredEvents.filter(e => e.lessons_learned).length})
        </button>
        <button
          onClick={() => setActiveCategory('mitigations')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeCategory === 'mitigations'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Mitigation Measures ({filteredEvents.filter(e => e.mitigation).length})
        </button>
        <button
          onClick={() => setActiveCategory('risk_intervals')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeCategory === 'risk_intervals'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Historical Risk Intervals ({filteredRiskIntervals.length})
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search keywords, LCM, stuck pipe, DDR..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* Well Filter */}
        <div>
          <select
            value={selectedWell}
            onChange={e => setSelectedWell(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Wells</option>
            {sihState.wells.map(w => (
              <option key={w.well_name} value={w.well_name}>
                {w.well_name} {w.is_nearby ? '(Nearby)' : '(Regional)'}
              </option>
            ))}
          </select>
        </div>

        {/* Formation Filter */}
        <div>
          <select
            value={selectedFormation}
            onChange={e => setSelectedFormation(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Formations</option>
            {sihState.formations.map(f => (
              <option key={f.name} value={f.name}>
                {f.name} ({f.top_depth}m - {f.bottom_depth || f.base_depth}m)
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Event Type Filter */}
        <div>
          <select
            value={selectedEventType}
            onChange={e => setSelectedEventType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Event Types</option>
            <option value="MUD_LOSS">Mud Loss</option>
            <option value="TORQUE_SPIKE">Torque Spike</option>
            <option value="STUCK_PIPE">Stuck Pipe</option>
            <option value="KICK">Kick / Overpressure</option>
            <option value="CEMENTING_ISSUE">Cementing Issue</option>
          </select>
        </div>
      </div>

      {/* Main Content List */}
      <div className="space-y-3">
        {/* Risk Intervals Section if selected or 'all' */}
        {(activeCategory === 'all' || activeCategory === 'risk_intervals') && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Historical Risk Intervals
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredRiskIntervals.map(ri => {
                const topD = ri.top_depth || ri.start_depth;
                const botD = ri.bottom_depth || ri.end_depth;
                const desc = ri.description || ri.evidence;
                const mit = ri.recommended_mitigation || 'Pre-treat with LCM pill & reduce downhole ECD';
                const contributing = ri.offset_wells ? ri.offset_wells.join(', ') : 'X12, X09, X21';
                return (
                  <div key={ri.id} className="panel-inset p-3 space-y-2 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">
                        {topD}m – {botD}m
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                        {ri.risk_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                    <div className="text-[11px] p-2 rounded bg-card/60 border border-border text-foreground space-y-1">
                      <span className="font-semibold text-primary">Proven Mitigation: </span>
                      {mit}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono flex items-center justify-between">
                      <span>Formation: {ri.formation_name || 'F3'}</span>
                      <span>Contributing: {contributing}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Operational Events & Lessons */}
        {activeCategory !== 'risk_intervals' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Historical Events & Documented Mitigations ({filteredEvents.length})</span>
              <span className="text-[11px] font-normal">Click well to open Well Intelligence</span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="panel-inset p-8 text-center text-xs text-muted-foreground">
                No historical records match your search and filter criteria.
              </div>
            ) : (
              filteredEvents.map(ev => {
                const isCrit = ev.severity === 'CRITICAL' || ev.severity === 'HIGH';
                return (
                  <div
                    key={ev.id}
                    className="panel-inset p-3.5 space-y-2.5 hover:border-primary/40 transition-colors"
                  >
                    {/* Top Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectWell && onSelectWell(ev.well_name)}
                          className="font-bold text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {ev.well_name}
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <span className="text-xs text-muted-foreground">|</span>
                        <span className="text-xs font-mono font-semibold">{ev.depth}m</span>
                        <span className="text-xs text-muted-foreground">|</span>
                        <span className="text-xs text-muted-foreground">Formation {ev.formation_name || 'F3'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            isCrit
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {ev.severity}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-foreground">
                          {ev.event_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="text-xs text-foreground leading-relaxed">
                      {ev.description}
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {/* Mitigation */}
                      {(activeCategory === 'all' || activeCategory === 'mitigations' || activeCategory === 'events') && ev.mitigation && (
                        <div className="p-2 rounded bg-card/60 border border-border space-y-0.5">
                          <div className="font-semibold text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Applied Mitigation:
                          </div>
                          <div className="text-[11px] text-muted-foreground">{ev.mitigation}</div>
                        </div>
                      )}

                      {/* Lessons Learned */}
                      {(activeCategory === 'all' || activeCategory === 'lessons' || activeCategory === 'events') && ev.lessons_learned && (
                        <div className="p-2 rounded bg-card/60 border border-border space-y-0.5">
                          <div className="font-semibold text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            Lesson Learned:
                          </div>
                          <div className="text-[11px] text-muted-foreground">{ev.lessons_learned}</div>
                        </div>
                      )}
                    </div>

                    {/* Source Traceability Footer */}
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-mono">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-primary" />
                        <span>Source: <strong className="text-foreground">{ev.source_doc}</strong> (Page {ev.source_page || 1})</span>
                      </div>
                      <div>
                        Outcome: <span className="text-foreground">{ev.outcome || 'Operations resumed'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
