import React, { useState } from 'react';
import { X, Sparkles, Send, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNwis } from '../context/NwisContext';
import { answerCopilotQuestion } from '../services/sihLocalStore';

interface AskNwisModalProps {
  onClose: () => void;
}

interface ChatMessage {
  q: string;
  answer: string;
  evidence: string;
  source: string;
  confidence: number;
}

export const AskNwisModal: React.FC<AskNwisModalProps> = ({ onClose }) => {
  const { currentDepth, sihState, activeWell } = useNwis();
  const targetWell = activeWell ?? sihState.activeWell;
  const targetWellName = targetWell?.well_name ?? 'Active Well';
  const targetFm = targetWell?.formation_name ?? 'F3';
  const targetReservoir = targetWell?.reservoir_name ?? 'R-Beta';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      q: 'System Status',
      answer: `NWIS Copilot connected to Active Target ${targetWellName} at ${currentDepth}m MD (Formation ${targetFm}, ${targetReservoir}). Grounded on ${sihState.wells.length} wells, ${sihState.events.length} verified historical operational events, and 8 indexed source documents. Ask anything regarding offset behavior, risks, or mitigations.`,
      evidence: 'Local structured historical dataset (SIH Problem Statement 26121)',
      source: 'NWIS Grounded Intelligence Core',
      confidence: 1.0
    }
  ]);

  const suggestedPrompts = [
    `What risks are approaching ${currentDepth}m?`,
    `Which well is most comparable to ${targetWellName}?`,
    'What mitigation was used for mud loss?',
    `Which wells had stuck pipe in ${targetFm}?`,
    'What happened in X12 around 3845m?',
    'What casing program was used in offset wells?'
  ];

  const handleSend = (text: string) => {
    const query = text.trim();
    if (!query) return;

    const res = answerCopilotQuestion(query, {
      currentDepth,
      activeWell: targetWell,
      nearbyWells: sihState.wells.filter(w => w.is_nearby),
      events: sihState.events
    });

    setMessages(prev => [
      ...prev,
      {
        q: query,
        answer: res.answer,
        evidence: res.evidence,
        source: res.source,
        confidence: res.confidence
      }
    ]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-primary/20 text-primary grid place-items-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">NWIS Copilot</span>
                <span className="badge-primary text-[9px] uppercase font-bold px-1.5 py-0.2 rounded">
                  GROUNDED
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Active: {targetWellName} · Bit @ {currentDepth}m MD · Formation {targetFm}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="panel-inset p-3 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Evidence-Backed Decision Support (PS 26121)
            </div>
            Answers are synthesized strictly from structured offset well histories, validated DDR logs, and field correlation intervals. No hallucinations.
          </div>

          {messages.map((msg, i) => (
            <div key={i} className="space-y-2">
              {/* User Question */}
              <div className="panel-inset p-2.5 text-xs rounded-br-none ml-auto max-w-[85%] w-fit bg-secondary text-foreground font-medium">
                {msg.q}
              </div>

              {/* Copilot Response */}
              <div className="panel p-3.5 text-xs rounded-bl-none max-w-[95%] space-y-2.5 border-l-3 border-l-primary">
                <p className="leading-relaxed text-foreground">{msg.answer}</p>

                {/* Evidence Box */}
                {msg.evidence && (
                  <div className="p-2 rounded bg-secondary/80 border border-border text-[11px] space-y-1">
                    <div className="font-semibold text-primary flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Supporting Evidence:
                    </div>
                    <div className="text-muted-foreground">{msg.evidence}</div>
                  </div>
                )}

                {/* Source Traceability */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/60 font-mono">
                  <div className="flex items-center gap-1 text-primary">
                    <FileText className="w-3 h-3" />
                    <span>{msg.source}</span>
                  </div>
                  <div>
                    Confidence: <strong className="text-foreground">{Math.round(msg.confidence * 100)}%</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input & Suggested Questions */}
        <div className="p-3 border-t border-border shrink-0 bg-card space-y-2">
          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {suggestedPrompts.map(p => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-primary/10 hover:text-primary border border-border transition-colors cursor-pointer text-left"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask about offset wells, mud loss, mitigations, depth..."
              className="flex-1 h-9 px-3 rounded border border-input bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => handleSend(input)}
              className="h-9 px-3 rounded bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
