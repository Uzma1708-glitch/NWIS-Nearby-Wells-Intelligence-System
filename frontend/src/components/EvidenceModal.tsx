import React from 'react';
import { X, FileText, Scan, Cpu, Database, ExternalLink } from 'lucide-react';
import type { DrillingEvent } from '../types/nwis';

interface EvidenceModalProps {
  event: DrillingEvent | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ event, onClose }) => {
  if (!event) return null;

  const pipelineSteps = [
    { icon: FileText, label: 'Source Document', value: event.source_doc },
    { icon: Scan, label: 'OCR', value: 'Page rendered & text recognised' },
    { icon: Cpu, label: 'NLP Extraction', value: 'Event entity, depth & severity parsed' },
    { icon: Database, label: 'Structured Event', value: `${event.event_type} @ ${event.depth_m} m` },
    { icon: ExternalLink, label: 'Evidence Ref', value: event.evidence_ref }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="label-tag text-muted-foreground">
              Document Intelligence · Evidence Trace
            </span>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pipeline flow */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
            {pipelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center min-w-[110px] panel-inset p-2.5 text-center flex-1">
                    <Icon className="w-4 h-4 text-primary mb-1 shrink-0" />
                    <div className="label-tag text-muted-foreground">{step.label}</div>
                    <div className="text-[10px] mt-1 leading-tight line-clamp-2">{step.value}</div>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <div className="text-muted-foreground text-sm font-bold px-0.5">→</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="panel-inset p-3 col-span-2">
              <div className="label-tag text-muted-foreground mb-1">Source Document</div>
              <div className="text-sm font-semibold">{event.source_doc}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Page {event.source_page} · Reference {event.source_doc_id}
              </div>
            </div>

            <div className="panel-inset p-3">
              <div className="label-tag text-muted-foreground">Well</div>
              <div className="text-sm font-semibold mt-1">{event.well_name}</div>
            </div>

            <div className="panel-inset p-3">
              <div className="label-tag text-muted-foreground">Depth / Formation</div>
              <div className="text-sm font-semibold mt-1">
                {event.depth_m} m · {event.formation}
              </div>
            </div>

            <div className="panel-inset p-3">
              <div className="label-tag text-muted-foreground">Event</div>
              <div className="text-sm font-semibold mt-1">
                {event.event_type} · {event.severity}
              </div>
            </div>

            <div className="panel-inset p-3">
              <div className="label-tag text-muted-foreground">Observation</div>
              <div className="text-xs mt-1 leading-relaxed">{event.description}</div>
            </div>

            <div className="panel-inset p-3 col-span-2">
              <div className="label-tag text-muted-foreground">Historical Response</div>
              <div className="text-xs mt-1 leading-relaxed">
                {event.mitigation ||
                  'No documented mitigation available in the current prototype dataset.'}
              </div>
            </div>
          </div>

          {/* Extracted snippet */}
          <div className="mt-3 panel-inset p-4 bg-secondary/40">
            <div className="text-[10px] text-muted-foreground mb-2 font-mono-nums">
              {event.source_doc_id} — p.{event.source_page}
            </div>
            <div className="text-[11px] leading-relaxed text-muted-foreground font-mono-nums">
              … drilling continued through {event.formation} at {event.depth_m} m. Observed{' '}
              {event.event_type.toLowerCase()} — {event.description.replace(/.*\./, '').toLowerCase()}{' '}
              Mitigation: {event.mitigation} …
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2">
            Representative document-intelligence demonstration. Source text is a prototype
            reconstruction, not an archived scan.
          </p>
        </div>
      </div>
    </div>
  );
};
