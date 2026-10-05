import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useNwis } from '../context/NwisContext';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { OverviewTab } from './tabs/OverviewTab';
import { SubsurfaceTab } from './tabs/SubsurfaceTab';
import { HistoryTab } from './tabs/HistoryTab';
import { RiskTab } from './tabs/RiskTab';
import { DrillTab } from './tabs/DrillTab';
import { AskNwisModal } from '../components/AskNwisModal';
import { BriefModal } from '../components/BriefModal';
import { SearchModal } from '../components/SearchModal';
import { WellIntelligenceDrawer } from '../components/WellIntelligenceDrawer';
import { DocumentIntelligenceModal } from '../components/DocumentIntelligenceModal';
import { CrossWellCorrelation } from '../components/CrossWellCorrelation';
import { KnowledgeRepositoryView } from '../components/KnowledgeRepositoryView';
import { RiskIntelligenceView } from '../components/RiskIntelligenceView';
import { SimulatedErtmacView } from '../components/SimulatedErtmacView';
import { MapView } from '../components/MapView';
import { ShieldAlert, BookOpen, Layers, Building2, CheckCircle2, ChevronRight } from 'lucide-react';
import { calculateRiskScoresForDepth } from '../services/sihLocalStore';
import type { DocumentItem, OperationalEvent } from '../types/sihDomain';

export const WorkspacePage: React.FC = () => {
  const {
    wells,
    proposedWell,
    loading,
    activeTab,
    viewMode,
    setViewMode,
    currentDepth,
    sihState,
    activeWell,
    sihRadius,
    setSihRadius,
    lookaheadDistance,
    nearbySihWells,
    proactiveAlert,
    selectedSihWell,
    setSelectedSihWell,
    openWellDrawer,
    showDocModal,
    setShowDocModal,
    addConfirmedDocument,
    setActiveWell
  } = useNwis();

  const [showAskNwis, setShowAskNwis] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [officeSubTab, setOfficeSubTab] = useState<'correlation' | 'knowledge' | 'risk'>('correlation');

  // If loading or not initialized
  if (!proposedWell && !loading) {
    return <Navigate to="/" replace />;
  }

  const LegacyTabComponent = {
    overview: OverviewTab,
    subsurface: SubsurfaceTab,
    history: HistoryTab,
    risk: RiskTab,
    drill: DrillTab
  }[activeTab];

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Top Navigation & Status Bar */}
      <Header
        onSearch={() => setShowSearch(true)}
        onAskNwis={() => setShowAskNwis(true)}
        onBrief={() => setShowBrief(true)}
        onOpenDocModal={() => setShowDocModal(true)}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar for Standard Tabs */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {loading ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Loading Nearby Wells Intelligence Dataset…
            </div>
          ) : activeTab !== 'overview' ? (
            /* Render individual legacy tab when explicitly clicked */
            <LegacyTabComponent />
          ) : viewMode === 'office' ? (
            /* OFFICE / ANALYSIS VIEW (Requirement 16) */
            <div className="p-4 space-y-4 max-w-7xl mx-auto">
              {/* Office Sub-Navigation Bar */}
              <div className="panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div>
                    <h1 className="text-sm font-bold tracking-tight">Office & Engineering Analysis View</h1>
                    <p className="text-xs text-muted-foreground">
                      Cross-well correlation tracks, geological formation comparison, structured knowledge, and historical hazard intelligence.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-secondary p-1 rounded-md border border-border">
                  <button
                    onClick={() => setOfficeSubTab('correlation')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                      officeSubTab === 'correlation'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Cross-Well Correlation
                  </button>

                  <button
                    onClick={() => setOfficeSubTab('knowledge')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                      officeSubTab === 'knowledge'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Knowledge Repository
                  </button>

                  <button
                    onClick={() => setOfficeSubTab('risk')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                      officeSubTab === 'risk'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Risk Intelligence
                  </button>
                </div>
              </div>

              {/* Office Sub-Views */}
              {officeSubTab === 'correlation' && (
                <CrossWellCorrelation
                  activeWell={sihState.activeWell}
                  currentDepth={currentDepth}
                  wells={sihState.wells}
                  formations={sihState.formations}
                  events={sihState.events}
                  drillingParameters={sihState.drillingParameters}
                  onSelectWell={(w) => {
                    const name = (w as any).well_name || (w as any).well_id;
                    if (name) {
                      setActiveWell(name);
                      setSelectedSihWell(w);
                    }
                  }}
                />
              )}

              {officeSubTab === 'knowledge' && (
                <KnowledgeRepositoryView
                  onSelectWell={(wellName) => {
                    setActiveWell(wellName);
                    openWellDrawer(wellName);
                  }}
                  onOpenDocModal={() => setShowDocModal(true)}
                />
              )}

              {officeSubTab === 'risk' && (
                <RiskIntelligenceView
                  currentDepth={currentDepth}
                  riskScores={calculateRiskScoresForDepth(currentDepth, sihState.events, activeWell, nearbySihWells)}
                  alert={proactiveAlert}
                />
              )}
            </div>
          ) : (
            /* FIELD VIEW (Requirement 16) */
            <div className="p-4 space-y-4 max-w-7xl mx-auto">
              {/* Proactive Risk Alert Banner (Req 10 & 11) */}
              {proactiveAlert ? (
                <div className="panel p-4 border-l-4 border-l-critical bg-critical/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-critical animate-ping" />
                      <span className="font-bold text-sm text-critical">
                        PROACTIVE RISK ALERT — HIGH OFFSET HAZARD OVERLAP
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-critical/20 text-critical font-bold border border-critical/40">
                        {proactiveAlert.severity}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      Depth: <strong className="text-foreground">{currentDepth}m</strong> · Interval: <strong className="text-amber-700 dark:text-amber-400">{proactiveAlert.risk_interval}</strong> · Formation: <strong className="text-primary">{proactiveAlert.formation}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-foreground leading-relaxed font-medium">
                    "{proactiveAlert.message}"
                  </p>

                  {/* Recommendation & Evidence Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded bg-card/70 border border-border space-y-1">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Evidence-Backed Recommendation:
                      </div>
                      <div className="text-muted-foreground leading-relaxed">
                        {proactiveAlert.recommendation}
                      </div>
                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50 font-mono">
                        Source Reference: <strong className="text-foreground">{proactiveAlert.source_doc}</strong>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-card/70 border border-border space-y-1">
                      <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Contributing Offset Wells:
                      </div>
                      <div className="text-muted-foreground">
                        {proactiveAlert.historical_wells.join(', ')} recorded severe incidents:
                      </div>
                      <div className="text-[11px] text-foreground font-mono space-y-0.5">
                        {proactiveAlert.historical_events.map((ev, i) => (
                          <div key={i}>• {ev}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Active Well {activeWell.well_name} at {currentDepth}m MD is operating within nominal geological margins for {activeWell.formation_name || 'target formation'} (+{lookaheadDistance}m look-ahead).</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">eRTMAC Surveillance Active</span>
                </div>
              )}

              {/* Simulated eRTMAC Stream (Req 15) */}
              <SimulatedErtmacView />

              {/* Grid: Interactive Offset Well Map + Explainable Nearby Wells */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
                {/* Interactive Map (Req 1) */}
                <div className="panel p-2 flex flex-col space-y-2">
                  <div className="flex items-center justify-between px-2 pt-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
                        Interactive Offset Well Map & Trajectories
                      </h3>
                      <span className="badge-primary text-[9px] uppercase px-1.5 py-0.2 rounded font-bold">
                        {sihRadius} km Radius · +{lookaheadDistance}m Look-Ahead
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Click well marker to inspect</span>
                  </div>

                  <div className="h-[420px] rounded overflow-hidden border border-border">
                    <MapView
                      wells={wells}
                      sihWells={sihState.wells}
                      trajectories={sihState.trajectories}
                      proposedWell={{ lat: activeWell.latitude, lng: activeWell.longitude, name: activeWell.well_name }}
                      activeWell={activeWell}
                      radiusKm={sihRadius}
                      onRadiusChange={setSihRadius}
                      onSelectWell={(w: any) => {
                        const name = w.well_name || w.well_id || (typeof w === 'string' ? w : '');
                        if (name) {
                          setActiveWell(name);
                          openWellDrawer(name);
                        }
                      }}
                      height="100%"
                    />
                  </div>
                </div>

                {/* Nearby Wells with Explainable Relevance (Req 2) */}
                <div className="panel p-3 space-y-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div>
                      <h3 className="text-xs font-bold uppercase text-foreground">
                        Nearby Offset Wells ({nearbySihWells.length})
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        PROTOTYPE OFFSET RELEVANCE
                      </span>
                    </div>
                    <button
                      onClick={() => setViewMode('office')}
                      className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Correlation</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                    {nearbySihWells.map(w => (
                      <div
                        key={w.id}
                        onClick={() => openWellDrawer(w.well_name)}
                        className="panel-inset p-3 hover:border-primary/50 transition-colors cursor-pointer space-y-2"
                      >
                        {/* Well Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{w.well_name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {w.distance_km?.toFixed(1)} km away
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                              {w.relevance_score || 85}% Relevance
                            </span>
                          </div>
                        </div>

                        {/* Explainable Reasons */}
                        <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                          {(w.relevance_reasons || []).slice(0, 3).map((r, i) => (
                            <div key={i} className="text-foreground/90 font-medium">{r}</div>
                          ))}
                        </div>

                        {/* Operational tags */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/50">
                          <span>Target: {w.formation_name} ({w.reservoir_name})</span>
                          <span>TD: {w.total_depth}m</span>
                          <span className="text-primary hover:underline font-semibold">Inspect &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 360-Degree Well Intelligence Drawer (Req 3) */}
      <WellIntelligenceDrawer
        well={selectedSihWell}
        events={sihState.events}
        trajectories={sihState.trajectories}
        drillingParameters={sihState.drillingParameters}
        casingPrograms={sihState.casingPrograms}
        cementingRecords={sihState.cementingRecords}
        mudPrograms={sihState.mudPrograms}
        documents={sihState.documents}
        onClose={() => setSelectedSihWell(null)}
      />

      {/* Document Intelligence Modal (Req 12 & 13) */}
      {showDocModal && (
        <DocumentIntelligenceModal
          onClose={() => setShowDocModal(false)}
          onConfirmEvents={(events: OperationalEvent[], docName: string, fileSize?: string) => {
            const primaryEvent = events[0] || {
              well_name: 'X09',
              depth: 3764,
              formation_name: 'Barail Shale',
              event_type: 'MUD_LOSS',
              severity: 'HIGH',
              mitigation: 'LCM pill'
            };
            const newDoc: DocumentItem = {
              id: Date.now(),
              well_name: primaryEvent.well_name,
              document_type: 'DDR',
              file_name: docName,
              file_size: fileSize || '1.4 MB',
              upload_date: new Date().toISOString().split('T')[0],
              extracted_depth: primaryEvent.depth,
              extracted_formation: primaryEvent.formation_name || 'Barail Shale',
              extracted_event: primaryEvent.event_type,
              extracted_severity: primaryEvent.severity,
              extracted_mitigation: primaryEvent.mitigation,
              confidence: 0.95,
              review_status: 'CONFIRMED'
            };
            addConfirmedDocument(newDoc, events);
          }}
          onConfirmEvent={(newEvent: OperationalEvent, docName: string) => {
            const newDoc: DocumentItem = {
              id: Date.now(),
              well_name: newEvent.well_name,
              document_type: 'DDR',
              file_name: docName,
              file_size: '1.4 MB',
              upload_date: new Date().toISOString().split('T')[0],
              extracted_depth: newEvent.depth,
              extracted_formation: newEvent.formation_name || 'Barail Shale',
              extracted_event: newEvent.event_type,
              extracted_severity: newEvent.severity,
              extracted_mitigation: newEvent.mitigation,
              confidence: 0.95,
              review_status: 'CONFIRMED'
            };
            addConfirmedDocument(newDoc, newEvent);
          }}
        />
      )}

      {/* Grounded NWIS Copilot (Req 14) */}
      {showAskNwis && <AskNwisModal onClose={() => setShowAskNwis(false)} />}

      {/* Legacy Search & Brief Modals */}
      {showBrief && <BriefModal onClose={() => setShowBrief(false)} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  );
};
