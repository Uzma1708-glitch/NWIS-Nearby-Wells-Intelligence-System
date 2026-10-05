import React from 'react';
import { Activity, Gauge, Flame, AlertCircle, Compass, Play, RotateCcw, Zap } from 'lucide-react';
import { useNwis } from '../context/NwisContext';

export const SimulatedErtmacView: React.FC = () => {
  const {
    currentDepth,
    setCurrentDepth,
    activeWell,
    sihState
  } = useNwis();

  // Find simulated telemetry corresponding to current depth or interpolate
  const params = sihState.drillingParameters.find(p => Math.abs(p.depth - currentDepth) <= 15) ||
    sihState.drillingParameters[0] || {
      depth: currentDepth,
      rop: 14.2,
      wob: 22.5,
      rpm: 110,
      torque: currentDepth >= 3810 && currentDepth <= 3870 ? 31.8 : 18.2,
      ecd: currentDepth >= 3810 ? 1.14 : 1.07,
      flow_rate: 1850,
      standpipe_pressure: 2850
    };

  const presetDepths = [3790, 3810, 3830, 3842, 3860, 3890];

  const inRiskZone = currentDepth >= 3810 && currentDepth <= 3870;
  const isTorqueSpike = (params.torque ?? 0) > 26;
  const isLossRisk = (params.ecd ?? 0) > 1.10;

  return (
    <div className="panel p-4 space-y-4">
      {/* Header and Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/20 text-primary grid place-items-center">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Simulated eRTMAC Stream</span>
              <span className="badge-primary text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                SIMULATED / DEMO TELEMETRY
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time telemetry simulation for Active Target <span className="text-foreground font-semibold">{activeWell?.well_name ?? 'Active Well'}</span> ({activeWell?.field ?? 'Field'}). Updating depth triggers dynamic offset hazard evaluation and look-ahead alerts.
            </p>
          </div>
        </div>

        {/* Step progression buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Progression:</span>
          {presetDepths.map(d => (
            <button
              key={d}
              onClick={() => setCurrentDepth(d)}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                currentDepth === d
                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                  : 'bg-secondary hover:bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}m
            </button>
          ))}
          <button
            onClick={() => setCurrentDepth(3790)}
            title="Reset to 3790m"
            className="p-1 rounded bg-secondary hover:bg-card text-muted-foreground hover:text-foreground border border-border cursor-pointer ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Depth */}
        <div className="panel-inset p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>BIT DEPTH</span>
            <Compass className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono text-primary">
            {currentDepth} <span className="text-xs text-muted-foreground font-normal">m MD</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            Formation: {activeWell?.formation_name ?? 'F3'} (Target)
          </div>
        </div>

        {/* ROP */}
        <div className="panel-inset p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>ROP</span>
            <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            {(params.rop ?? 14.2).toFixed(1)} <span className="text-xs text-muted-foreground font-normal">m/hr</span>
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Normal penetration</div>
        </div>

        {/* WOB */}
        <div className="panel-inset p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>WOB</span>
            <Gauge className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            {(params.wob ?? 22.5).toFixed(1)} <span className="text-xs text-muted-foreground font-normal">klbs</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Limit: 30.0 klbs</div>
        </div>

        {/* RPM */}
        <div className="panel-inset p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>SURFACE RPM</span>
            <Play className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono">
            {Math.round(params.rpm ?? 110)} <span className="text-xs text-muted-foreground font-normal">rpm</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Rotary drive</div>
        </div>

        {/* Torque */}
        <div className={`panel-inset p-3 flex flex-col justify-between border ${
          isTorqueSpike ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'
        }`}>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>TORQUE</span>
            <Flame className={`w-3.5 h-3.5 ${isTorqueSpike ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${isTorqueSpike ? 'text-amber-700 dark:text-amber-400' : ''}`}>
            {(params.torque ?? 18.2).toFixed(1)} <span className="text-xs text-muted-foreground font-normal">kNm</span>
          </div>
          <div className={`text-[10px] font-semibold ${isTorqueSpike ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
            {isTorqueSpike ? 'HIGH STICK-SLIP' : 'Nominal band'}
          </div>
        </div>

        {/* ECD */}
        <div className={`panel-inset p-3 flex flex-col justify-between border ${
          isLossRisk ? 'border-red-500/50 bg-red-500/5' : 'border-border'
        }`}>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>ECD (DOWNHOLE)</span>
            <AlertCircle className={`w-3.5 h-3.5 ${isLossRisk ? 'text-critical' : 'text-muted-foreground'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${isLossRisk ? 'text-critical' : ''}`}>
            {(params.ecd ?? 1.08).toFixed(2)} <span className="text-xs text-muted-foreground font-normal">sg</span>
          </div>
          <div className={`text-[10px] font-semibold ${isLossRisk ? 'text-critical' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {isLossRisk ? 'Loss threshold (>1.10)' : 'Safe window'}
          </div>
        </div>

        {/* Mud Flow & Pressure */}
        <div className="panel-inset p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>FLOW / SPP</span>
            <Activity className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
          </div>
          <div className="text-sm font-bold font-mono">
            {Math.round(params.flow_rate ?? 1850)} <span className="text-[10px] text-muted-foreground font-normal">lpm</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            {Math.round(params.standpipe_pressure ?? 2850)} psi
          </div>
        </div>
      </div>

      {/* Proactive Risk Linkage Indicator */}
      <div className={`p-3 rounded border text-xs flex items-center justify-between gap-4 ${
        inRiskZone
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${inRiskZone ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          <span>
            {inRiskZone
              ? `ACTIVE RISK TRIGGER: Bit is inside offset hazard interval 3810m–3870m (${activeWell?.formation_name ?? 'F3'}). Proactive alert is broadcasting.`
              : 'Bit is currently outside known offset risk intervals. Continuous surveillance active.'}
          </span>
        </div>

        <div className="text-[11px] text-muted-foreground font-mono shrink-0">
          Source: Simulated eRTMAC Stream (Local Prototype)
        </div>
      </div>
    </div>
  );
};
