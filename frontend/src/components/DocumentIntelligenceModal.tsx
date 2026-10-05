import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Scan,
  Cpu,
  Database,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  FileUp,
  Info
} from 'lucide-react';
import type { OperationalEvent } from '../types/sihDomain';
import {
  extractDocumentContent,
  validateUploadedFile,
  formatFileSize,
  type ExtractionProgress
} from '../services/fileExtractor';
import {
  parseDrillingReport,
  type ExtractedEventItem
} from '../services/nwisNlpParser';

interface DocumentIntelligenceModalProps {
  onClose: () => void;
  onConfirmEvent?: (newEvent: OperationalEvent, docName: string) => void;
  onConfirmEvents?: (events: OperationalEvent[], docName: string, fileSize?: string) => void;
}

const SAMPLE_FILES = [
  { name: 'DDR_X12_3845.pdf', label: 'DDR_X12_3845.pdf (Primary Demo File)', url: '/samples/DDR_X12_3845.pdf' },
  { name: 'DDR_X09_3790.pdf', label: 'DDR_X09_3790.pdf (New Synthetic DDR - Barail Shale)', url: '/samples/DDR_X09_3790.pdf' },
  { name: 'ddr_scanned_page.png', label: 'ddr_scanned_page.png (Scanned Page OCR Demo)', url: '/samples/ddr_scanned_page.png' },
  { name: 'DDR_X09_3790.txt', label: 'DDR_X09_3790.txt (Plain Text Drilling Log)', url: '/samples/DDR_X09_3790.txt' }
];

const FALLBACK_SAMPLE_TEXTS: Record<string, string> = {
  'DDR_X09_3790.pdf': `DAILY DRILLING REPORT - Well X09\nReport Date: 2024-04-12 | Current Depth: 3790 m MD | Basin: Assam-Arakan\nFormation Lithology Table:\nBarail Shale: 3700 m to 3820 m\nOperations Summary & Incident Log:\nAt 3764 m depth in Barail Shale, severe mud loss observed with loss rate ~18 bbl/hr.\nMitigation: Spotted LCM pill (CaCO3 25 ppb) to cure lost circulation.\nAt 3772 m, experienced tight hole and stuck pipe condition with 18 tonnes overpull. Worked string worked free after 45 minutes.\nDrilling continued: torque spike observed across 3778 to 3790 m with erratic torque 17 to 26 kNm.\nMitigation applied: mud weight raised 1.06 to 1.09 sg, conducted wiper trip, connection standstill under 10 minutes.`,
  'DDR_X09_3790.txt': `DAILY DRILLING REPORT - Well X09\nReport Date: 2024-04-12 | Current Depth: 3790 m MD | Basin: Assam-Arakan\nFormation Lithology Table:\nBarail Shale: 3700 m to 3820 m\nOperations Summary & Incident Log:\nAt 3764 m depth in Barail Shale, severe mud loss observed with loss rate ~18 bbl/hr.\nMitigation: Spotted LCM pill (CaCO3 25 ppb) to cure lost circulation.\nAt 3772 m, experienced tight hole and stuck pipe condition with 18 tonnes overpull. Worked string worked free after 45 minutes.\nDrilling continued: torque spike observed across 3778 to 3790 m with erratic torque 17 to 26 kNm.\nMitigation applied: mud weight raised 1.06 to 1.09 sg, conducted wiper trip, connection standstill under 10 minutes.`,
  'DDR_X12_3845.pdf': `DAILY DRILLING REPORT - Well X12\nReport Date: 2022-12-10 | Current Depth: 3845 m MD\nFormation: F3 (Base transition)\nOperations Summary:\nAt 3845 m MD during rotary drilling, significant mud loss encountered. Loss rate ~25 bbl/hr with total lost circulation risk.\nRoot Cause: Natural fracture network encountered at transition into F3 base.\nMitigation: Pumped 50-bbl mixed coarse/medium LCM pill. Lowered flow rate to 1400 lpm to reduce downhole ECD to 1.08 sg.`
};

export const DocumentIntelligenceModal: React.FC<DocumentIntelligenceModalProps> = ({
  onClose,
  onConfirmEvent,
  onConfirmEvents
}) => {
  const [stage, setStage] = useState<'upload' | 'processing' | 'review' | 'confirmed'>('upload');

  // File state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedSampleName, setSelectedSampleName] = useState<string>('DDR_X12_3845.pdf');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extraction & progress state
  const [progress, setProgress] = useState<ExtractionProgress>({
    stage: 'reading',
    message: 'Initializing pipeline…',
    percent: 0
  });

  // Extracted entities state
  const [targetWellId, setTargetWellId] = useState<string>('X12');
  const [activeFileName, setActiveFileName] = useState<string>('DDR_X12_3845.pdf');
  const [activeFileSize, setActiveFileSize] = useState<string>('1.2 MB');
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Summary state for confirmed step
  const [confirmedSummary, setConfirmedSummary] = useState<{
    count: number;
    types: Record<string, number>;
    depthRange: string;
    well: string;
  }>({
    count: 0,
    types: {},
    depthRange: '0m',
    well: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection from drag-and-drop or file dialog
  const handleFileChosen = (file: File) => {
    const validation = validateUploadedFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      return;
    }

    setErrorMessage(null);
    setUploadedFile(file);
    setActiveFileName(file.name);
    setActiveFileSize(formatFileSize(file.size));
  };

  // Drag-and-drop events with preventDefault & visual highlight
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  // Pipeline Execution (Stage 2: Real Text Extraction & Rule-based NLP)
  const handleStartExtraction = async () => {
    setErrorMessage(null);
    setStage('processing');

    try {
      let docResult;
      // Uploaded file takes absolute priority over sample dropdown
      if (uploadedFile) {
        setActiveFileName(uploadedFile.name);
        setActiveFileSize(formatFileSize(uploadedFile.size));
        docResult = await extractDocumentContent(uploadedFile, prg => setProgress(prg));
      } else {
        const sample = SAMPLE_FILES.find(s => s.name === selectedSampleName) || SAMPLE_FILES[0];
        setActiveFileName(sample.name);
        setActiveFileSize('1.2 MB');
        try {
          docResult = await extractDocumentContent({ name: sample.name, url: sample.url }, prg => setProgress(prg));
        } catch (fetchErr) {
          console.warn('Sample fetch fallback triggered:', fetchErr);
          const fallbackText = FALLBACK_SAMPLE_TEXTS[sample.name];
          if (fallbackText) {
            docResult = {
              fileName: sample.name,
              fileSize: '1.2 MB',
              fileType: 'DDR',
              fullText: fallbackText,
              pages: [{ pageNumber: 1, text: fallbackText, isOcr: false }]
            };
          } else {
            throw fetchErr;
          }
        }
      }

      setProgress({
        stage: 'nlp',
        message: 'Parsing geological entities, depths, and mitigation measures…',
        percent: 90
      });

      // Local rule-based NLP extraction
      const nlpResult = parseDrillingReport(docResult.fullText, docResult.fileName);

      setTargetWellId(nlpResult.wellId || 'X12');
      setExtractedEvents(nlpResult.events);
      if (nlpResult.events.length > 0) {
        setSelectedEventId(nlpResult.events[0].id);
      }

      setProgress({
        stage: 'complete',
        message: `Extraction complete. Identified ${nlpResult.events.length} operational incidents.`,
        percent: 100
      });

      // Transition to Stage 3: Human Review
      setTimeout(() => {
        setStage('review');
      }, 400);

    } catch (err: any) {
      console.error('Document intelligence pipeline error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during extraction.');
      setStage('upload');
    }
  };

  // Update specific field in an extracted event row
  const handleUpdateEvent = (id: string, field: keyof ExtractedEventItem, value: any) => {
    setExtractedEvents(prev =>
      prev.map(ev => (ev.id === id ? { ...ev, [field]: value } : ev))
    );
  };

  // Delete event row
  const handleDeleteEvent = (id: string) => {
    setExtractedEvents(prev => prev.filter(ev => ev.id !== id));
    if (selectedEventId === id) {
      setSelectedEventId(null);
    }
  };

  // Add missing event manually
  const handleAddManualEvent = () => {
    const newId = `manual-${Date.now()}`;
    const newEvent: ExtractedEventItem = {
      id: newId,
      event_type: 'MUD_LOSS',
      depth_m: 3800,
      formation: 'Barail Shale',
      severity: 'HIGH',
      magnitude: '15 bbl/hr',
      mitigation: 'Pumped LCM pill',
      cause: 'Manual operator entry',
      description: 'Manually added operational event during review verification.',
      source_file: activeFileName,
      source_page: 1,
      source_text_snippet: 'Manual verification addition by user.',
      confidence: 1.0
    };
    setExtractedEvents(prev => [...prev, newEvent]);
    setSelectedEventId(newId);
  };

  // Confirm and store events into NWIS knowledge repository
  const handleConfirmAndStore = () => {
    if (extractedEvents.length === 0) {
      setErrorMessage('Please add at least one operational event before confirming.');
      return;
    }

    const well = targetWellId.trim().toUpperCase() || 'UNKNOWN';

    // Map extracted items to full SihDomain OperationalEvent interface
    const domainEvents: OperationalEvent[] = extractedEvents.map((item, idx) => ({
      id: Date.now() + idx,
      well_name: well,
      event_type: item.event_type as any,
      depth: item.depth_m,
      start_depth: item.depth_m,
      end_depth: item.depth_m_end,
      formation_id: 3,
      formation_name: item.formation || 'Barail Shale',
      severity: item.severity,
      cause: item.cause || `${item.event_type} at ${item.depth_m}m`,
      description: item.description,
      outcome: 'Mitigation applied. Returns and drilling operational integrity restored.',
      npt_hours: item.severity === 'CRITICAL' ? 24 : item.severity === 'HIGH' ? 8 : 2,
      event_date: new Date().toISOString().slice(0, 10),
      source_doc: activeFileName,
      source_page: item.source_page || 1,
      mitigation: item.mitigation,
      lessons_learned: `Encountered in ${item.formation || 'formation'}: apply verified mitigation (${item.mitigation}).`,
      mitigations: [
        {
          id: Date.now() + idx * 10 + 1,
          event_id: Date.now() + idx,
          mitigation: item.mitigation,
          result: 'Controlled incident with verified field mitigation procedure.',
          success_indicator: 'SUCCESS'
        }
      ]
    }));

    // Calculate summary statistics for Stage 4
    const typeCounts: Record<string, number> = {};
    let minD = Infinity;
    let maxD = -Infinity;

    domainEvents.forEach(e => {
      typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
      if (e.depth < minD) minD = e.depth;
      if (e.depth > maxD) maxD = e.depth;
      if (e.end_depth && e.end_depth > maxD) maxD = e.end_depth;
    });

    setConfirmedSummary({
      count: domainEvents.length,
      types: typeCounts,
      depthRange: minD !== Infinity ? `${minD}m – ${maxD}m` : 'N/A',
      well
    });

    // Write to NWIS Knowledge Base
    if (onConfirmEvents) {
      onConfirmEvents(domainEvents, activeFileName, activeFileSize);
    } else if (onConfirmEvent && domainEvents.length > 0) {
      onConfirmEvent(domainEvents[0], activeFileName);
    }

    setStage('confirmed');
  };

  const selectedEvent = extractedEvents.find(e => e.id === selectedEventId) || extractedEvents[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-5 bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary text-primary-foreground grid place-items-center">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="font-display font-bold text-sm">Document Intelligence Pipeline</div>
              <div className="text-[10px] text-muted-foreground">OCR → NLP Extraction → Entity Review → Knowledge Store</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Progress Stages */}
        <div className="flex items-center border-b border-border bg-secondary/30 px-5 py-2.5 text-[11px] overflow-x-auto gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 font-semibold ${stage === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Upload className="w-3.5 h-3.5" /> 1. Upload
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <div className={`flex items-center gap-1.5 font-semibold ${stage === 'processing' ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}>
            <Cpu className="w-3.5 h-3.5" /> 2. OCR & NLP
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <div className={`flex items-center gap-1.5 font-semibold ${stage === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Edit3 className="w-3.5 h-3.5" /> 3. Human Review
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <div className={`flex items-center gap-1.5 font-semibold ${stage === 'confirmed' ? 'text-teal' : 'text-muted-foreground'}`}>
            <Database className="w-3.5 h-3.5" /> 4. Knowledge Stored
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-xs text-destructive flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-destructive font-bold hover:underline cursor-pointer ml-3"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* STAGE 1: UPLOAD & FILE INPUT */}
          {stage === 'upload' && (
            <div className="space-y-4">
              <div className="panel-inset p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">SIH Document Processing: </span>
                Upload historical Daily Drilling Reports (DDR), Well Completion Reports (WCR), mud logs, or scanned incident sheets to automatically extract operational events, formation depths, and mitigation approaches into the NWIS local knowledge base.
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.tiff,.tif,.png,.jpg,.jpeg,.txt"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChosen(e.target.files[0]);
                  }
                }}
              />

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`panel border-dashed border-2 p-8 text-center flex flex-col items-center justify-center gap-3 rounded-lg cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                    : 'border-border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary grid place-items-center mb-1">
                  <FileUp className="w-6 h-6 animate-bounce-subtle" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {uploadedFile ? 'Replace selected file' : 'Click to Browse or Drag Drilling Report Here'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Accepted formats: PDF, TIFF, PNG, JPG, JPEG, and TXT (Max 20 MB)
                  </div>
                </div>

                {/* Selected File Badge */}
                {uploadedFile ? (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-xs font-mono font-semibold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{uploadedFile.name} ({formatFileSize(uploadedFile.size)})</span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        setActiveFileName(selectedSampleName);
                      }}
                      className="ml-1 text-primary hover:text-foreground cursor-pointer"
                      title="Clear custom upload"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">
                    No custom file selected yet. You can upload any drilling document or choose a sample below.
                  </div>
                )}
              </div>

              {/* Sample Document Section (Optional Shortcut) */}
              <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-secondary/10">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">Or Load Sample Document: </span>
                    <span className="text-muted-foreground">Quick test with preset synthetic drilling logs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    disabled={!!uploadedFile}
                    value={selectedSampleName}
                    onChange={e => {
                      setSelectedSampleName(e.target.value);
                      setActiveFileName(e.target.value);
                    }}
                    className={`h-9 px-3 rounded-md border border-input bg-card text-xs font-semibold cursor-pointer ${
                      uploadedFile ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {SAMPLE_FILES.map(sample => (
                      <option key={sample.name} value={sample.name}>
                        {sample.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleStartExtraction}
                    className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shrink-0"
                  >
                    Extract Information <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {uploadedFile && (
                <div className="text-[11px] text-teal flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>User-uploaded file <strong>{uploadedFile.name}</strong> will take priority and be processed through the pipeline.</span>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2: PROCESSING (REAL PROGRESS) */}
          {stage === 'processing' && (
            <div className="panel p-10 text-center flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold">
                  {progress.percent}%
                </div>
              </div>

              <div>
                <div className="font-semibold text-base">Analyzing {activeFileName}…</div>
                <div className="text-xs text-muted-foreground mt-1 max-w-md">
                  {progress.message}
                </div>
              </div>

              {/* Real Progress Bar */}
              <div className="w-full max-w-md bg-secondary/60 h-2 rounded-full overflow-hidden border border-border">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${Math.max(5, progress.percent || 10)}%` }}
                />
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="panel-inset px-2 py-0.5 font-mono">Size: {activeFileSize}</span>
                <span className="panel-inset px-2 py-0.5 font-mono">Stage: {progress.stage.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* STAGE 3: HUMAN REVIEW & EDITABLE TABLE */}
          {stage === 'review' && (
            <div className="space-y-4">
              {/* Header with target well and confidence */}
              <div className="flex flex-wrap items-center justify-between gap-3 panel p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Target Well ID
                    </label>
                    <input
                      value={targetWellId}
                      onChange={e => setTargetWellId(e.target.value.toUpperCase())}
                      placeholder="e.g. X09"
                      className="h-8 px-2.5 rounded border border-input bg-card text-xs font-bold w-32 focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                    />
                  </div>

                  <div className="border-l border-border pl-3">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Source Document
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground">{activeFileName}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">({activeFileSize})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddManualEvent}
                    className="h-8 px-3 rounded border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Missing Event
                  </button>
                  <div className="flex items-center gap-1.5 panel-inset px-2.5 py-1 bg-teal/10 border-teal/30 text-teal text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{extractedEvents.length} Incidents Extracted</span>
                  </div>
                </div>
              </div>

              {/* Editable Events Table */}
              <div className="panel overflow-hidden border border-border rounded-lg">
                <div className="px-4 py-2.5 bg-secondary/30 border-b border-border text-xs font-semibold flex items-center justify-between">
                  <span>Extracted Operational Events (Click or edit row to verify)</span>
                  <span className="text-[11px] text-muted-foreground">Rows highlighted in amber indicate confidence &lt; 0.60</span>
                </div>

                {extractedEvents.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="text-sm font-semibold">No operational events automatically detected</div>
                    <div className="text-xs text-muted-foreground">
                      The document may not contain matching drilling incident keywords, or is formatted differently.
                    </div>
                    <button
                      onClick={handleAddManualEvent}
                      className="mt-2 h-8 px-4 rounded bg-primary text-primary-foreground text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Event Manually
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[38vh]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-secondary/40 text-[11px] font-semibold text-muted-foreground sticky top-0 border-b border-border z-10">
                        <tr>
                          <th className="p-2.5 pl-3">Type</th>
                          <th className="p-2.5">Depth (m)</th>
                          <th className="p-2.5">Formation</th>
                          <th className="p-2.5">Severity / Magnitude</th>
                          <th className="p-2.5">Mitigation Measure</th>
                          <th className="p-2.5 text-center">Confidence</th>
                          <th className="p-2.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {extractedEvents.map(ev => {
                          const isLowConfidence = ev.confidence < 0.6;
                          const isSelected = ev.id === selectedEventId;

                          return (
                            <tr
                              key={ev.id}
                              onClick={() => setSelectedEventId(ev.id)}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? 'bg-primary/10' : ''
                              } ${
                                isLowConfidence
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20'
                                  : 'hover:bg-secondary/30'
                              }`}
                            >
                              {/* Event Type */}
                              <td className="p-2 pl-3">
                                <select
                                  value={ev.event_type}
                                  onChange={e => handleUpdateEvent(ev.id, 'event_type', e.target.value)}
                                  className="h-7 px-2 rounded border border-input bg-card text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="MUD_LOSS">MUD_LOSS</option>
                                  <option value="STUCK_PIPE">STUCK_PIPE</option>
                                  <option value="TORQUE_SPIKE">TORQUE_SPIKE</option>
                                  <option value="KICK">KICK</option>
                                  <option value="OVERPRESSURE">OVERPRESSURE</option>
                                  <option value="CEMENTING_ISSUE">CEMENTING_ISSUE</option>
                                  <option value="NPT">NPT</option>
                                </select>
                              </td>

                              {/* Depth */}
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={ev.depth_m}
                                    onChange={e => handleUpdateEvent(ev.id, 'depth_m', Number(e.target.value))}
                                    className="w-16 h-7 px-1.5 rounded border border-input bg-card font-mono text-xs text-right font-semibold"
                                  />
                                  {ev.depth_m_end ? (
                                    <>
                                      <span className="text-muted-foreground">-</span>
                                      <input
                                        type="number"
                                        value={ev.depth_m_end}
                                        onChange={e => handleUpdateEvent(ev.id, 'depth_m_end', Number(e.target.value))}
                                        className="w-16 h-7 px-1.5 rounded border border-input bg-card font-mono text-xs text-right font-semibold"
                                      />
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">m</span>
                                  )}
                                </div>
                              </td>

                              {/* Formation */}
                              <td className="p-2">
                                <input
                                  value={ev.formation}
                                  onChange={e => handleUpdateEvent(ev.id, 'formation', e.target.value)}
                                  className="w-28 h-7 px-2 rounded border border-input bg-card text-xs font-semibold"
                                />
                              </td>

                              {/* Magnitude & Severity */}
                              <td className="p-2">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={ev.severity}
                                    onChange={e => handleUpdateEvent(ev.id, 'severity', e.target.value)}
                                    className="h-7 px-1.5 rounded border border-input bg-card text-[11px] font-bold"
                                  >
                                    <option value="LOW">LOW</option>
                                    <option value="MEDIUM">MED</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="CRITICAL">CRIT</option>
                                  </select>
                                  <input
                                    value={ev.magnitude}
                                    onChange={e => handleUpdateEvent(ev.id, 'magnitude', e.target.value)}
                                    placeholder="e.g. 18 bbl/hr"
                                    className="w-36 h-7 px-2 rounded border border-input bg-card text-xs"
                                  />
                                </div>
                              </td>

                              {/* Mitigation */}
                              <td className="p-2">
                                <input
                                  value={ev.mitigation}
                                  onChange={e => handleUpdateEvent(ev.id, 'mitigation', e.target.value)}
                                  placeholder="Mitigation applied"
                                  className="w-full min-w-[200px] h-7 px-2 rounded border border-input bg-card text-xs"
                                />
                              </td>

                              {/* Confidence */}
                              <td className="p-2 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    isLowConfidence
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                      : 'bg-teal/20 text-teal border border-teal/40'
                                  }`}
                                  title={isLowConfidence ? 'Confidence below 0.60: check snippet & verify' : 'High confidence'}
                                >
                                  {isLowConfidence && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                                  {Math.round(ev.confidence * 100)}%
                                </span>
                              </td>

                              {/* Delete */}
                              <td className="p-2 text-center">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteEvent(ev.id);
                                  }}
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                                  title="Delete event row"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Source Snippet Evidence Inspector */}
              {selectedEvent && (
                <div className="panel-inset p-3 bg-secondary/10 border border-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1 text-primary">
                      <Info className="w-3.5 h-3.5" /> Source Document Evidence Snippet (Page {selectedEvent.source_page || 1})
                    </span>
                    <span className="font-mono">Event: {selectedEvent.event_type} @ {selectedEvent.depth_m}m</span>
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px] bg-card p-2 rounded border border-border leading-relaxed">
                    "{selectedEvent.source_text_snippet || selectedEvent.description}"
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStage('upload')}
                  className="px-4 h-9 rounded-md border border-border bg-card hover:bg-secondary text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-upload
                </button>
                <button
                  onClick={handleConfirmAndStore}
                  className="flex-1 h-9 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> CONFIRM & STORE IN KNOWLEDGE REPOSITORY ({extractedEvents.length} Events)
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: CONFIRMED & KNOWLEDGE STORED */}
          {stage === 'confirmed' && (
            <div className="panel p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-teal/10 text-teal border border-teal/30 grid place-items-center mx-auto">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="font-bold text-lg">Knowledge Successfully Stored!</div>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  The document <strong>{activeFileName}</strong> has been extracted, validated, and injected into the NWIS local repository for <strong>Well {confirmedSummary.well}</strong>.
                </p>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
                <div className="panel-inset p-3 bg-card border border-border">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">Events Ingested</div>
                  <div className="text-lg font-bold font-mono text-primary mt-0.5">{confirmedSummary.count}</div>
                </div>
                <div className="panel-inset p-3 bg-card border border-border">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">Depth Interval</div>
                  <div className="text-xs font-bold font-mono text-foreground mt-1">{confirmedSummary.depthRange}</div>
                </div>
                <div className="panel-inset p-3 bg-card border border-border">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">Target Well</div>
                  <div className="text-xs font-bold font-mono text-teal mt-1">{confirmedSummary.well}</div>
                </div>
              </div>

              {/* Event Types Breakdown */}
              <div className="panel p-3 max-w-md mx-auto text-left text-xs space-y-1.5 bg-secondary/20">
                <span className="font-semibold text-muted-foreground text-[11px] block">Ingested Incidents Breakdown:</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(confirmedSummary.types).map(([type, count]) => (
                    <span key={type} className="panel-inset px-2.5 py-1 text-[11px] font-mono bg-card">
                      <strong>{count}</strong>× {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Propagation Confirmation */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto text-[11px]">
                <span className="panel-inset px-2.5 py-1">✓ Knowledge Repository Search</span>
                <span className="panel-inset px-2.5 py-1">✓ Well Intelligence</span>
                <span className="panel-inset px-2.5 py-1">✓ Cross-Well Correlation</span>
                <span className="panel-inset px-2.5 py-1">✓ Proactive Risk Alerts</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-8 h-9 rounded-md bg-foreground text-background font-semibold text-xs cursor-pointer hover:opacity-90 shadow-sm"
                >
                  Close & Explore Updated Views
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
