import React from 'react';
import { ShieldAlert, FileText } from 'lucide-react';
import type { RiskScoreItem, ProactiveAlert, OperationalEvent } from '../types/sihDomain';

interface RiskIntelligenceViewProps {
  currentDepth: number;
  riskScores: RiskScoreItem[];
  alert: ProactiveAlert | null;
  onTraceEvidence?: (sourceDoc: string) => void;
  onSelectEvent?: (event: OperationalEvent) => void;
}

export const RiskIntelligenceView: React.FC<RiskIntelligenceViewProps> = ({
  currentDepth,
  riskScores,
  alert,
  onTraceEvidence
}) => {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* 1. DYNAMIC PROACTIVE ALERT BANNER */}
      {alert && (
        <div className="panel p-5 border-l-4 border-l-critical bg-critical/5 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-critical shrink-0 animate-pulse" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-critical">PROACTIVE RISK ALERT</span>
                  <span className="tag-proto">DYNAMIC DRILLING TRIGGER</span>
                </div>
                <div className="text-xs font-semibold text-foreground mt-0.5">{alert.message}</div>
              </div>
            </div>
            <span className="text-xs font-mono-nums font-bold px-2 py-0.5 rounded bg-critical/15 text-critical border border-critical/30">
              Depth: {alert.current_depth}m
            </span>
          </div>

          {/* Alert Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs">
            <div className="panel-inset p-2">
              <span className="text-[10px] text-muted-foreground block">Active Well</span>
              <span className="font-bold">{alert.well_name}</span>
            </div>
            <div className="panel-inset p-2">
              <span className="text-[10px] text-muted-foreground block">Risk Interval</span>
              <span className="font-bold font-mono-nums text-primary">{alert.risk_interval}</span>
            </div>
            <div className="panel-inset p-2">
              <span className="text-[10px] text-muted-foreground block">Target Formation</span>
              <span className="font-bold">{alert.formation}</span>
            </div>
            <div className="panel-inset p-2">
              <span className="text-[10px] text-muted-foreground block">Historical Wells</span>
              <span className="font-bold">{alert.historical_wells.join(', ')}</span>
            </div>
          </div>

          {/* Evidence & Recommendation Section */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="panel-inset p-3 bg-secondary/50">
              <div className="label-tag text-muted-foreground mb-1">Supporting Historical Evidence</div>
              <p className="leading-relaxed text-muted-foreground">{alert.evidence}</p>
              <div className="mt-2 text-[11px] font-mono-nums text-primary flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Source: {alert.source_doc}
              </div>
            </div>

            <div className="panel-inset p-3 bg-teal/5 border border-teal/30">
              <div className="label-tag text-teal mb-1 font-bold">Evidence-Backed Recommendation</div>
              <p className="leading-relaxed text-foreground font-medium">{alert.recommendation}</p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Decision Support Only</span>
                {onTraceEvidence && (
                  <button
                    onClick={() => onTraceEvidence(alert.source_doc)}
                    className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View Document →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROTOTYPE RISK SCORES (5 HAZARDS) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="label-tag text-muted-foreground">PROTOTYPE RISK INTELLIGENCE SCORES</span>
            <span className="text-xs text-muted-foreground font-mono-nums">@ Active Depth {currentDepth}m (F3)</span>
          </div>
          <span className="tag-model">EXPLAINABLE DEMO MODEL</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {riskScores.map(item => {
            const isHigh = item.level === 'HIGH' || item.level === 'CRITICAL';
            const isMed = item.level === 'MEDIUM';
            return (
              <div
                key={item.risk_type}
                className={`panel p-3.5 flex flex-col justify-between border-t-4 transition-shadow ${
                  isHigh ? 'border-t-critical' : isMed ? 'border-t-amber' : 'border-t-teal'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{item.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isHigh ? 'bg-critical/15 text-critical' : isMed ? 'bg-amber/15 text-amber' : 'bg-teal/15 text-teal'
                    }`}>
                      {item.score}/100
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? 'bg-critical' : isMed ? 'bg-amber' : 'bg-teal'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-muted-foreground mb-2">{item.explanation}</div>
                </div>

                <div className="pt-2 border-t border-border/60 text-[10px]">
                  <span className="text-muted-foreground block mb-0.5">Historical Offset Wells:</span>
                  <span className="font-bold text-foreground">{item.historical_wells.join(', ')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. HISTORICAL RISK INTERVALS DETECTED */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="label-tag text-muted-foreground">Historical Risk Intervals in Geological Corridor</span>
          <span className="tag-proto">PROTOTYPE INTERVALS</span>
        </div>

        <div className="space-y-2">
          {[
            {
              interval: '3810m – 3870m',
              formation: 'F3 (Primary Hazard Cluster)',
              risks: ['MUD_LOSS', 'TORQUE_SPIKE', 'STUCK_PIPE'],
              wells: ['X12', 'X09', 'X21', 'X07'],
              severity: 'HIGH',
              active: currentDepth >= 3810 && currentDepth <= 3870
            },
            {
              interval: '3870m – 3910m',
              formation: 'F3 Base Transition',
              risks: ['STUCK_PIPE', 'CEMENTING_ISSUE'],
              wells: ['X12', 'X11'],
              severity: 'CRITICAL',
              active: currentDepth > 3870 && currentDepth <= 3910
            }
          ].map((ri, i) => (
            <div
              key={i}
              className={`panel-inset p-3 border transition-colors ${
                ri.active ? 'border-critical bg-critical/5 ring-1 ring-critical/30' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm font-mono-nums">{ri.interval}</span>
                  <span className="text-xs font-semibold text-muted-foreground">({ri.formation})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    ri.severity === 'CRITICAL' || ri.severity === 'HIGH'
                      ? 'bg-critical/15 text-critical border-critical/30'
                      : 'bg-amber/15 text-amber border-amber/30'
                  }`}>
                    {ri.severity} RISK
                  </span>
                  {ri.active && (
                    <span className="text-[10px] bg-critical text-white font-bold px-1.5 py-0.5 rounded animate-pulse">
                      ACTIVE NOW
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div>Risks: <strong className="text-foreground">{ri.risks.join(', ')}</strong></div>
                <div>Offset Evidence: <strong className="text-foreground">{ri.wells.join(', ')}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
