import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Well, ProposedWell, DrillingEvent, RiskZone } from '../types/nwis';
import {
  fetchWells,
  getNearbyWells,
  getAllHistoricalEvents,
  computeRiskZones
} from '../services/nwisData';
import {
  getInitialSihData,
  recalculateAllDistancesAndRelevance,
  evaluateProactiveAlert
} from '../services/sihLocalStore';
import type {
  Well as SihWell,
  OperationalEvent,
  DocumentItem,
  Formation as SihFormation,
  Reservoir,
  RiskInterval,
  TrajectoryPoint,
  DrillingParameterPoint,
  CasingProgram,
  CementingRecord,
  MudProgram,
  ProactiveAlert
} from '../types/sihDomain';

export interface SihContextState {
  formations: SihFormation[];
  reservoirs: Reservoir[];
  wells: SihWell[];
  activeWell: SihWell;
  events: OperationalEvent[];
  documents: DocumentItem[];
  riskIntervals: RiskInterval[];
  trajectories: TrajectoryPoint[];
  drillingParameters: DrillingParameterPoint[];
  casingPrograms: CasingProgram[];
  cementingRecords: CementingRecord[];
  mudPrograms: MudProgram[];
}

interface NwisContextType {
  // Legacy fields
  wells: Well[];
  loading: boolean;
  proposedWell: ProposedWell | null;
  setProposedWell: (well: ProposedWell | null) => void;
  searchRadius: number;
  setSearchRadius: (radius: number) => void;
  nearbyWells: Well[];
  events: DrillingEvent[];
  riskZones: RiskZone[];
  currentDepth: number;
  setCurrentDepth: (depth: number) => void;
  selectedWellIds: string[];
  setSelectedWellIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleSelectedWell: (id: string) => void;
  activeTab: 'overview' | 'subsurface' | 'history' | 'risk' | 'drill';
  setActiveTab: (tab: 'overview' | 'subsurface' | 'history' | 'risk' | 'drill') => void;
  demoMode: boolean;
  setDemoMode: (mode: boolean) => void;
  startDemo: () => void;

  // SIH PS 26121 Capabilities
  sihState: SihContextState;
  setSihState: React.Dispatch<React.SetStateAction<SihContextState>>;
  activeWell: SihWell;
  setActiveWell: (wellOrName: SihWell | string) => void;
  selectedWellId: string;
  setSelectedWellId: (id: string) => void;
  sihRadius: number;
  setSihRadius: (radius: number) => void;
  lookaheadDistance: number;
  setLookaheadDistance: (dist: number) => void;
  nearbySihWells: SihWell[];
  proactiveAlert: ProactiveAlert | null;
  selectedSihWell: SihWell | null;
  setSelectedSihWell: (well: SihWell | null) => void;
  openWellDrawer: (wellName: string) => void;
  viewMode: 'field' | 'office';
  setViewMode: (mode: 'field' | 'office') => void;
  showDocModal: boolean;
  setShowDocModal: (show: boolean) => void;
  addConfirmedDocument: (doc: DocumentItem, newEvents?: OperationalEvent | OperationalEvent[]) => void;
}

const NwisContext = createContext<NwisContextType | null>(null);

export function useNwis(): NwisContextType {
  const ctx = useContext(NwisContext);
  if (!ctx) throw new Error('useNwis must be used within NwisProvider');
  return ctx;
}

interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('nwis-theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('nwis-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function NwisProvider({ children }: { children: React.ReactNode }) {
  // SIH Domain State (100% frontend local prototype data)
  const [sihState, setSihState] = useState<SihContextState>(() => getInitialSihData());
  const [sihRadius, setSihRadius] = useState<number>(5.0);
  const [lookaheadDistance, setLookaheadDistance] = useState<number>(150);
  const [selectedSihWell, setSelectedSihWell] = useState<SihWell | null>(null);
  const [viewMode, setViewMode] = useState<'field' | 'office'>('field');
  const [showDocModal, setShowDocModal] = useState<boolean>(false);

  // Active depth (default to active well's current depth)
  const [currentDepth, setCurrentDepth] = useState<number>(() => sihState.activeWell.current_depth || 3842);

  // Default proposed well from activeWell
  const [proposedWell, setProposedWell] = useState<ProposedWell | null>(() => ({
    lat: sihState.activeWell.latitude,
    lng: sihState.activeWell.longitude,
    name: sihState.activeWell.well_name,
    maxDepth: sihState.activeWell.total_depth
  }));

  const [wells, setWells] = useState<Well[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [selectedWellIds, setSelectedWellIds] = useState<string[]>(['X12', 'X09', 'X21']);
  const [activeTab, setActiveTab] = useState<'overview' | 'subsurface' | 'history' | 'risk' | 'drill'>('overview');
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Dynamic active well switch — controls ALL downstream calculations!
  const setActiveWell = useCallback((wellOrName: SihWell | string) => {
    setSihState(prev => {
      let target: SihWell | undefined;
      const wellQuery = typeof wellOrName === 'string'
        ? wellOrName.toUpperCase().trim()
        : wellOrName.well_name.toUpperCase().trim();

      target = prev.wells.find(w => w.well_name.toUpperCase() === wellQuery);

      if (!target && proposedWell && proposedWell.name.toUpperCase() === wellQuery) {
        target = {
          id: 9999,
          well_name: proposedWell.name,
          field: 'Dutch Basin (Target)',
          formation_id: 3,
          reservoir_id: 2,
          formation_name: 'F3',
          reservoir_name: 'R-Beta',
          latitude: proposedWell.lat,
          longitude: proposedWell.lng,
          status: 'ACTIVE',
          spud_date: '2024-01-15',
          operator: 'Oil India Limited',
          total_depth: proposedWell.maxDepth || 4200,
          current_depth: currentDepth || 3820,
          distance_km: 0,
          is_nearby: false,
          relevance_score: 100,
          relevance_reasons: ['Target exploration well']
        };
      }

      if (!target && wells.length > 0) {
        const bgWell = wells.find(w => (w.well_name || w.well_id).toUpperCase() === wellQuery);
        if (bgWell) {
          target = {
            id: Number(bgWell.id) || 8888,
            well_name: bgWell.well_name || bgWell.well_id,
            field: bgWell.field_name || 'Dutch Basin',
            formation_id: 3,
            reservoir_id: 2,
            formation_name: 'F3',
            reservoir_name: 'R-Beta',
            latitude: bgWell.latitude,
            longitude: bgWell.longitude,
            status: 'ACTIVE',
            spud_date: '2020-01-01',
            operator: 'Oil India Limited',
            total_depth: bgWell.end_depth_m || 4000,
            current_depth: currentDepth || 3820,
            distance_km: bgWell.distance_km || 0,
            is_nearby: false,
            relevance_score: 100,
            relevance_reasons: ['Selected offset well']
          };
        }
      }

      if (!target) {
        target = typeof wellOrName === 'object' ? wellOrName : prev.activeWell;
      }

      const updatedWellsList = prev.wells.some(w => w.well_name.toUpperCase() === target!.well_name.toUpperCase())
        ? prev.wells
        : [target, ...prev.wells];

      // Recalculate all distances and offset relevance relative to target well
      const updatedWells = recalculateAllDistancesAndRelevance(target, updatedWellsList, prev.events, sihRadius);
      const updatedActiveWell = updatedWells.find(w => w.well_name.toUpperCase() === target!.well_name.toUpperCase()) || target;

      setProposedWell({
        lat: target.latitude,
        lng: target.longitude,
        name: target.well_name,
        maxDepth: target.total_depth
      });

      if (target.current_depth) {
        setCurrentDepth(target.current_depth);
      }

      return {
        ...prev,
        activeWell: updatedActiveWell,
        wells: updatedWells
      };
    });
  }, [proposedWell, wells, currentDepth, sihRadius]);

  // Synchronize setProposedWell with activeWell and sihState
  const handleSetProposedWell = useCallback((newProposed: ProposedWell | null) => {
    setProposedWell(newProposed);
    if (newProposed) {
      const pWell: SihWell = {
        id: 9999,
        well_name: newProposed.name || 'P-01',
        field: 'Dutch Basin (Target)',
        formation_id: 3,
        reservoir_id: 2,
        formation_name: 'F3',
        reservoir_name: 'R-Beta',
        latitude: newProposed.lat,
        longitude: newProposed.lng,
        status: 'ACTIVE',
        spud_date: '2024-01-15',
        operator: 'Oil India Limited',
        total_depth: newProposed.maxDepth || 4200,
        current_depth: currentDepth || 3820,
        distance_km: 0,
        is_nearby: false,
        relevance_score: 100,
        relevance_reasons: ['Active target well']
      };

      setSihState(prev => {
        const exists = prev.wells.some(w => w.well_name.toUpperCase() === pWell.well_name.toUpperCase());
        const updatedWellsList = exists
          ? prev.wells.map(w => w.well_name.toUpperCase() === pWell.well_name.toUpperCase() ? { ...w, latitude: pWell.latitude, longitude: pWell.longitude } : w)
          : [pWell, ...prev.wells];

        const recalculated = recalculateAllDistancesAndRelevance(pWell, updatedWellsList, prev.events, sihRadius);
        return {
          ...prev,
          activeWell: pWell,
          wells: recalculated
        };
      });
    }
  }, [currentDepth, sihRadius]);

  // Dynamic radius update — recalculates nearby wells
  const handleSetSihRadius = useCallback((radius: number) => {
    setSihRadius(radius);
    setSearchRadius(radius);
    setSihState(prev => ({
      ...prev,
      wells: recalculateAllDistancesAndRelevance(prev.activeWell, prev.wells, prev.events, radius)
    }));
  }, []);

  // Filter nearby SIH wells dynamically based on sihRadius and activeWell
  const nearbySihWells = useMemo(() => {
    return sihState.wells.filter(
      w => w.well_name !== sihState.activeWell.well_name && (w.distance_km ?? 99) <= sihRadius
    );
  }, [sihState.wells, sihState.activeWell.well_name, sihRadius]);

  // Evaluate dynamic proactive alert based on active well, depth, and nearby offsets
  const proactiveAlert = useMemo(() => {
    return evaluateProactiveAlert(
      currentDepth,
      sihState.activeWell,
      nearbySihWells,
      sihState.events,
      lookaheadDistance
    );
  }, [currentDepth, sihState.activeWell, nearbySihWells, sihState.events, lookaheadDistance]);

  // Map SIH wells to legacy Well format so both systems work smoothly
  useEffect(() => {
    fetchWells()
      .then(w => {
        const sihMappedWells: Well[] = sihState.wells.map(sw => ({
          id: String(sw.id),
          well_id: sw.well_name,
          well_name: sw.well_name,
          field_name: sw.field || '',
          status: sw.status,
          latitude: sw.latitude,
          longitude: sw.longitude,
          end_depth_m: sw.total_depth,
          distance_km: sw.distance_km
        }));
        // Merge SIH wells first followed by any background wells
        setWells([...sihMappedWells, ...w.filter(item => !sihMappedWells.some(s => s.well_name === item.well_name))]);
      })
      .catch(() => {
        const sihMappedWells: Well[] = sihState.wells.map(sw => ({
          id: String(sw.id),
          well_id: sw.well_name,
          well_name: sw.well_name,
          field_name: sw.field || '',
          status: sw.status,
          latitude: sw.latitude,
          longitude: sw.longitude,
          end_depth_m: sw.total_depth,
          distance_km: sw.distance_km
        }));
        setWells(sihMappedWells);
      })
      .finally(() => setLoading(false));
  }, [sihState.wells]);

  // Nearby wells calculated dynamically based on sihRadius
  const nearbyWells = useMemo(() => {
    if (!proposedWell || !wells.length) return [];
    return getNearbyWells(wells, proposedWell.lat, proposedWell.lng, sihRadius);
  }, [proposedWell, wells, sihRadius]);

  const events = useMemo(() => getAllHistoricalEvents(nearbyWells), [nearbyWells]);
  const riskZones = useMemo(() => computeRiskZones(events), [events]);

  const toggleSelectedWell = useCallback((id: string) => {
    setSelectedWellIds(prev => (prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]));
  }, []);

  const openWellDrawer = useCallback((wellName: string) => {
    const found = sihState.wells.find(w => w.well_name === wellName);
    if (found) {
      setSelectedSihWell(found);
    }
  }, [sihState.wells]);

  // Dynamic document review confirmation updates local knowledge repository & events
  const addConfirmedDocument = useCallback((doc: DocumentItem, newEvents?: OperationalEvent | OperationalEvent[]) => {
    setSihState(prev => {
      const updatedDocs = [doc, ...prev.documents.filter(d => d.id !== doc.id)];
      const evtsToAdd = Array.isArray(newEvents) ? newEvents : (newEvents ? [newEvents] : []);
      const updatedEvents = evtsToAdd.length > 0 ? [...evtsToAdd, ...prev.events] : prev.events;

      let updatedWellsList = prev.wells;
      if (doc.well_name && !prev.wells.some(w => w.well_name === doc.well_name)) {
        const newWellEntry: SihWell = {
          id: Date.now(),
          well_name: doc.well_name,
          status: 'COMPLETED',
          latitude: prev.activeWell.latitude + (Math.random() - 0.5) * 0.04,
          longitude: prev.activeWell.longitude + (Math.random() - 0.5) * 0.04,
          total_depth: doc.extracted_depth ? Math.max(4000, doc.extracted_depth + 150) : 4000,
          current_depth: doc.extracted_depth ? Math.max(4000, doc.extracted_depth + 150) : 4000,
          formation_id: 3,
          formation_name: doc.extracted_formation || 'F3',
          reservoir_id: 2,
          reservoir_name: 'R-Beta',
          operator: 'ONGC',
          spud_date: new Date().toISOString().slice(0, 10),
          field: 'Prototype Field Alpha',
          notes: `Uploaded from ${doc.file_name}`
        };
        updatedWellsList = [newWellEntry, ...prev.wells];
      }

      const updatedWells = recalculateAllDistancesAndRelevance(prev.activeWell, updatedWellsList, updatedEvents, sihRadius);

      return {
        ...prev,
        documents: updatedDocs,
        events: updatedEvents,
        wells: updatedWells
      };
    });
  }, [sihRadius]);

  const startDemo = useCallback(() => {
    setActiveWell('X17');
    handleSetSihRadius(5.0);
    setCurrentDepth(3842);
    setDemoMode(true);
    setActiveTab('overview');
  }, [setActiveWell, handleSetSihRadius]);

  const value: NwisContextType = {
    wells,
    loading,
    proposedWell,
    setProposedWell: handleSetProposedWell,
    searchRadius,
    setSearchRadius,
    nearbyWells,
    events,
    riskZones,
    currentDepth,
    setCurrentDepth,
    selectedWellIds,
    setSelectedWellIds,
    toggleSelectedWell,
    activeTab,
    setActiveTab,
    demoMode,
    setDemoMode,
    startDemo,

    // SIH
    sihState,
    setSihState,
    activeWell: sihState.activeWell,
    setActiveWell,
    selectedWellId: sihState.activeWell.well_name,
    setSelectedWellId: setActiveWell,
    sihRadius,
    setSihRadius: handleSetSihRadius,
    lookaheadDistance,
    setLookaheadDistance,
    nearbySihWells,
    proactiveAlert,
    selectedSihWell,
    setSelectedSihWell,
    openWellDrawer,
    viewMode,
    setViewMode,
    showDocModal,
    setShowDocModal,
    addConfirmedDocument
  };

  return <NwisContext.Provider value={value}>{children}</NwisContext.Provider>;
}
