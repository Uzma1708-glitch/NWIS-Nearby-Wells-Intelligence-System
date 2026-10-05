import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import { useNwis } from '../../context/NwisContext';
import { TelemetryCard } from '../../components/TelemetryCard';
import { ExplainableAlertCard } from '../../components/ExplainableAlertCard';
import { EvidenceModal } from '../../components/EvidenceModal';
import { getFormationForDepth } from '../../services/nwisData';
import type { TelemetryPoint, HazardPrediction, DrillingEvent } from '../../types/nwis';

const SPEED_OPTIONS = [1, 2, 4];
const HAZARD_COLORS = [
  'hsl(150 40% 40%)',
  'hsl(var(--amber))',
  'hsl(var(--steel))',
  'hsl(var(--critical))'
];

function classifyHazard(point: TelemetryPoint): HazardPrediction {
  const { depth, rop, wob, torque, mudWeight } = point;
  if (mudWeight < 1.12 && depth > 1400) {
    return { class: 3, label: 'Gas Kick', conf: 0.78 };
  }
  if (torque > 19) {
    return { class: 2, label: 'Stuck Pipe', conf: 0.71 };
  }
  if (rop > 42 && wob < 6) {
    return { class: 1, label: 'Mud Loss', conf: 0.66 };
  }
  return { class: 0, label: 'Safe', conf: 0.82 };
}

export const DrillTab: React.FC = () => {
  const { nearbyWells, riskZones, events, currentDepth, setCurrentDepth, toggleSelectedWell } =
    useNwis();

  const maxDepth = useMemo(() => {
    const depths = nearbyWells.map(w => Number(w.end_depth_m) || 0);
    return Math.min(3600, Math.max(2500, ...depths));
  }, [nearbyWells]);

  const [isDrilling, setIsDrilling] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [bitDepth, setBitDepth] = useState(Math.max(0, currentDepth - 200));
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [evidenceEvent, setEvidenceEvent] = useState<DrillingEvent | null>(null);

  const timerRef = useRef<number | null>(null);

  // Generate synthetic telemetry for current bit depth
  const generateTelemetry = (d: number): TelemetryPoint => {
    getFormationForDepth(d);
    const inRiskZone = riskZones.find(z => d >= z.top && d <= z.bottom);

    let rop = 28 + 8 * Math.sin(d / 180) + (Math.random() - 0.5) * 4;
    let wob = 12 + 3 * Math.cos(d / 220) + (Math.random() - 0.5) * 1.5;
    let torque = 11 + 4 * Math.sin(d / 150) + (Math.random() - 0.5) * 2;
    const rpm = 110 + (Math.random() - 0.5) * 6;
    const pressure = 220 + d * 0.05 + (Math.random() - 0.5) * 8;
    let mudWeight = 1.18 + d / 8000 + (Math.random() - 0.5) * 0.02;

    if (inRiskZone) {
      rop += 12;
      torque += 6;
      wob -= 3;
      mudWeight -= 0.06;
    }

    return {
      depth: Math.round(d),
      rop,
      wob,
      torque,
      rpm,
      pressure,
      mudWeight
    };
  };

  // Real-time drilling simulation loop
  useEffect(() => {
    if (isDrilling) {
      timerRef.current = window.setInterval(() => {
        setBitDepth(prev => {
          const next = Math.min(maxDepth, prev + 2 * speed);
          const point = generateTelemetry(next);
          setTelemetryHistory(hist => [...hist, point].slice(-60));
          return next;
        });
      }, 220);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDrilling, speed, maxDepth, riskZones]);

  useEffect(() => {
    if (isDrilling) {
      setCurrentDepth(Math.round(bitDepth));
    }
  }, [bitDepth, isDrilling, setCurrentDepth]);

  const handleReset = () => {
    setIsDrilling(false);
    setBitDepth(Math.max(0, currentDepth - 200));
    setTelemetryHistory([]);
  };

  const currentPoint = telemetryHistory[telemetryHistory.length - 1];
  const hazard = currentPoint ? classifyHazard(currentPoint) : { class: 0, label: 'Idle', conf: 0 };

  if (nearbyWells.length === 0) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground p-8 text-center">
        No nearby wells within the search radius. Adjust the radius on the Overview to enable
        drilling simulation context.
      </div>
    );
  }

  const telemetryFields = [
    { field: 'rop' as const, label: 'ROP', unit: 'm/h', color: 'hsl(var(--chart-1))', reference: 42 },
    { field: 'wob' as const, label: 'WOB', unit: 't', color: 'hsl(var(--chart-2))' },
    { field: 'torque' as const, label: 'Torque', unit: 'kN·m', color: 'hsl(var(--chart-3))', reference: 19 },
    { field: 'rpm' as const, label: 'RPM', unit: 'rpm', color: 'hsl(var(--chart-5))' },
    { field: 'pressure' as const, label: 'Pressure', unit: 'bar', color: 'hsl(var(--steel))' },
    { field: 'mudWeight' as const, label: 'Mud Wt', unit: 'sg', color: 'hsl(var(--amber))', reference: 1.12 }
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Top Tag Bar */}
      <div className="mb-1 flex items-center gap-2">
        <span className="label-tag text-muted-foreground">Module 5 · Drill Simulator</span>
        <span className="tag-sim">SIMULATED / DEMO TELEMETRY</span>
        <span className="tag-model">PROTOTYPE HAZARD MODEL</span>
      </div>

      {/* Controls Bar */}
      <div className="panel p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {isDrilling ? (
            <button
              onClick={() => setIsDrilling(false)}
              className="h-9 px-3 rounded-md bg-amber text-amber-foreground hover:opacity-90 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-opacity"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
          ) : (
            <button
              onClick={() => setIsDrilling(true)}
              className="h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <Play className="w-4 h-4" /> Start Drilling
            </button>
          )}

          <button
            onClick={handleReset}
            className="h-9 px-3 rounded-md border border-border bg-card hover:bg-secondary text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>

          <div className="flex items-center gap-1.5 ml-1">
            <span className="label-tag text-muted-foreground">Speed</span>
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`w-9 h-8 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
                  speed === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:bg-secondary'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div>
              <span className="label-tag text-muted-foreground">Bit Depth</span>{' '}
              <span className="font-mono-nums text-lg font-bold text-primary ml-1">
                {Math.round(bitDepth)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">m</span>
            </div>
            <span className="tag-sim hidden sm:inline-flex">SIMULATED TELEMETRY</span>
          </div>
        </div>
      </div>

      {/* Telemetry Charts Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {telemetryFields.map(tf => (
          <TelemetryCard
            key={tf.field}
            data={telemetryHistory}
            field={tf.field}
            label={tf.label}
            unit={tf.unit}
            color={tf.color}
            reference={tf.reference}
          />
        ))}
      </div>

      {/* Hazard Model & Explainable Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prototype Hazard Model Card */}
        <div className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <span className="label-tag text-muted-foreground">Prototype Hazard Model</span>
            <span className="tag-model ml-auto">PROTOTYPE MODEL</span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full grid place-items-center text-white font-bold text-xl shadow-md transition-all duration-300 shrink-0"
              style={{ background: HAZARD_COLORS[hazard.class] }}
            >
              {hazard.class}
            </div>
            <div>
              <div className="text-base font-semibold">{hazard.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Confidence (prototype): {Math.round(hazard.conf * 100)}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Simulated XGBoost-style classifier using depth, rop, wob, torque, rpm, mud_weight.
                Not trained on NLOG events.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-3 text-[10px]">
            {[
              ['0 Safe', 0],
              ['1 Mud Loss', 1],
              ['2 Stuck Pipe', 2],
              ['3 Gas Kick', 3]
            ].map(([title, code]) => (
              <div
                key={code}
                className="panel-inset p-1.5 text-center transition-opacity"
                style={{ opacity: hazard.class === code ? 1 : 0.45 }}
              >
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ background: HAZARD_COLORS[code as number] }}
                />
                {title}
              </div>
            ))}
          </div>
        </div>

        {/* Explainable Alert Card */}
        <ExplainableAlertCard
          currentDepth={Math.round(bitDepth)}
          riskZones={riskZones}
          events={events}
          onEvidence={ev => setEvidenceEvent(ev)}
          onCompare={wellIds => wellIds.forEach(id => toggleSelectedWell(id))}
        />
      </div>

      {evidenceEvent && (
        <EvidenceModal event={evidenceEvent} onClose={() => setEvidenceEvent(null)} />
      )}
    </div>
  );
};
