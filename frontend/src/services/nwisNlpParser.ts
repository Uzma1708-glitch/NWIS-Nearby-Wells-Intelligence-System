export interface ExtractedEventItem {
  id: string;
  event_type: 'MUD_LOSS' | 'STUCK_PIPE' | 'TORQUE_SPIKE' | 'KICK' | 'OVERPRESSURE' | 'CEMENTING_ISSUE' | 'NPT';
  depth_m: number;
  depth_m_end?: number;
  formation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  magnitude: string;
  mitigation: string;
  cause: string;
  description: string;
  source_file: string;
  source_page: number;
  source_text_snippet: string;
  confidence: number;
}

export interface ParseResult {
  wellId: string;
  reportDate?: string;
  events: ExtractedEventItem[];
  formationTable: Array<{ formation: string; top: number; bottom: number }>;
  rawText: string;
}

// Synonym dictionary per specification
const EVENT_SYNONYMS: Record<ExtractedEventItem['event_type'], string[]> = {
  MUD_LOSS: [
    'mud loss',
    'lost circulation',
    'partial losses',
    'total losses',
    'loss of returns',
    'seepage loss'
  ],
  STUCK_PIPE: [
    'stuck pipe',
    'pipe stuck',
    'differential sticking',
    'pack-off',
    'pack off',
    'overpull',
    'tight hole',
    'tight spot',
    'string stuck',
    'worked free'
  ],
  TORQUE_SPIKE: [
    'torque spike',
    'high torque',
    'torque rise',
    'erratic torque',
    'torque increase'
  ],
  KICK: [
    'kick',
    'well flow',
    'influx',
    'gas influx',
    'pit gain'
  ],
  OVERPRESSURE: [
    'overpressure',
    'abnormal pressure',
    'high pore pressure'
  ],
  CEMENTING_ISSUE: [
    'poor cement bond',
    'cement channeling',
    'cement job problem',
    'squeeze job',
    'low top of cement'
  ],
  NPT: [
    'non-productive time',
    'npt',
    'waiting on',
    'downtime'
  ]
};

const KNOWN_FORMATIONS = [
  'Barail',
  'Tipam',
  'Girujan',
  'Kopili',
  'Sylhet',
  'Langpar',
  'Dupi Tila',
  'F1',
  'F2',
  'F3',
  'F4'
];



function cleanNumber(str: string): number {
  return parseFloat(str.replace(/,/g, ''));
}

/**
 * Parses report header to extract Well ID (e.g., "Well X09", "X12", "Well: X09")
 */
export function extractWellId(text: string, fileName?: string): string {
  // Try pattern from text header
  const headerMatch = text.match(/(?:well(?:\s*(?:name|id|no|#)?:?|\s*[-:]))\s*([A-Za-z0-9_-]+)/i);
  if (headerMatch && headerMatch[1]) {
    const candidate = headerMatch[1].trim();
    if (candidate.length >= 2 && candidate.length <= 15) {
      return candidate.toUpperCase().replace(/^WELL\s*/i, '');
    }
  }

  // Look for standalone Well X09 / Well X12 pattern
  const wellWordMatch = text.match(/\bWell\s+([A-Za-z0-9_-]+)\b/i);
  if (wellWordMatch && wellWordMatch[1]) {
    return wellWordMatch[1].toUpperCase();
  }

  // Fallback to filename (e.g. DDR_X09_3790.pdf -> X09)
  if (fileName) {
    const fnMatch = fileName.match(/([XW]\d{2,3})/i);
    if (fnMatch) return fnMatch[1].toUpperCase();
  }

  return '';
}

/**
 * Parses formation depth tables in text:
 * e.g., "Barail Shale: 3700 m to 3820 m" or "Barail 3700 - 3820 m"
 */
export function extractFormationTable(text: string): Array<{ formation: string; top: number; bottom: number }> {
  const table: Array<{ formation: string; top: number; bottom: number }> = [];
  const lines = text.split(/\r?\n/);

  const tableRegex = /([A-Za-z0-9_-]+(?:\s+(?:Shale|Sandstone|Sand|Formation|Limestone|Claystone))?)\s*[:|-]?\s*(?:from\s*)?(\d{3,5})\s*(?:m)?\s*(?:to|-|–)\s*(\d{3,5})\s*(?:m)?/i;

  for (const line of lines) {
    const match = line.match(tableRegex);
    if (match) {
      const name = match[1].trim();
      const top = cleanNumber(match[2]);
      const bottom = cleanNumber(match[3]);
      // Verify name looks like a geological formation
      const isKnown = KNOWN_FORMATIONS.some(kf => name.toLowerCase().includes(kf.toLowerCase()));
      if (isKnown || /(?:Shale|Sandstone|Formation|Limestone|Claystone)/i.test(name)) {
        table.push({ formation: name, top: Math.min(top, bottom), bottom: Math.max(top, bottom) });
      }
    }
  }

  return table;
}

/**
 * Determines formation from text or fallback formation table
 */
function resolveFormation(
  textSnippet: string,
  depth: number,
  formationTable: Array<{ formation: string; top: number; bottom: number }>,
  headerFormation?: string
): string {
  // 1. Look for explicit formation mention in snippet
  const formRegex = /\b(Barail(?:\s+Shale|\s+Sandstone|\s+Formation)?|Tipam(?:\s+Sandstone|\s+Sand|\s+Formation)?|Girujan(?:\s+Claystone|\s+Shale|\s+Formation)?|Kopili(?:\s+Shale|\s+Formation)?|Sylhet(?:\s+Limestone|\s+Formation)?|Langpar(?:\s+Formation)?|Dupi\s*Tila(?:\s+Formation)?|F[1-4](?:\s+Formation)?)\b/i;
  const match = textSnippet.match(formRegex);
  if (match) {
    return match[1].trim();
  }

  // Generic "<Name> Shale/Sandstone/Formation"
  const genericMatch = textSnippet.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Shale|Sandstone|Sand|Formation|Limestone|Claystone))\b/);
  if (genericMatch) {
    return genericMatch[1].trim();
  }

  // 2. Check depth against formation table
  for (const entry of formationTable) {
    if (depth >= entry.top && depth <= entry.bottom) {
      return entry.formation;
    }
  }

  // 3. Fallback to header formation
  if (headerFormation) {
    return headerFormation;
  }

  return 'F3';
}

/**
 * Parses depth value or range from a snippet
 */
function extractDepthInfo(snippet: string, reportTotalDepth: number | null): {
  depth: number;
  depthEnd?: number;
  isFallback: boolean;
} {
  // 1. Range: "across 3778 to 3790 m", "from 3731 m to 3790 m", "3778-3790 m", "3778 to 3790 m"
  const rangeRegex = /(?:across|from|between)?\s*(\d{1,2}(?:,\d{3})*|\d{3,5})\s*(?:m|m\s*MD|meters)?\s*(?:to|-|–)\s*(\d{1,2}(?:,\d{3})*|\d{3,5})\s*(?:m\b|m\s*MD|meters\b)/i;
  const rangeMatch = snippet.match(rangeRegex);
  if (rangeMatch) {
    const d1 = cleanNumber(rangeMatch[1]);
    const d2 = cleanNumber(rangeMatch[2]);
    return {
      depth: Math.min(d1, d2),
      depthEnd: Math.max(d1, d2),
      isFallback: false
    };
  }

  // 2. Single depth: "at 3764 m", "3764 m MD", "3,764 m", "@ 3764m"
  const singleRegex = /(?:at|depth:?|@)?\s*(\d{1,2}(?:,\d{3})*|\d{3,5})\s*(?:m\b|m\s*MD|meters\b)/i;
  const singleMatch = snippet.match(singleRegex);
  if (singleMatch) {
    return {
      depth: cleanNumber(singleMatch[1]),
      isFallback: false
    };
  }

  // 3. Fallback to report total depth if found
  if (reportTotalDepth && reportTotalDepth > 0) {
    return {
      depth: reportTotalDepth,
      isFallback: true
    };
  }

  return { depth: 0, isFallback: true };
}

/**
 * Extracts magnitude / severity details from snippet
 */
function extractMagnitude(snippet: string, eventType: ExtractedEventItem['event_type']): { magnitude: string; severity: ExtractedEventItem['severity'] } {
  let mag = '';
  let severity: ExtractedEventItem['severity'] = 'HIGH';

  if (eventType === 'MUD_LOSS') {
    const lossRateMatch = snippet.match(/(?:loss\s*rate\s*~?\s*|~?\s*)(\d+(?:\.\d+)?\s*(?:bbl\/hr|bbls\/hr|m3\/hr|bbl|barrels))/i);
    if (lossRateMatch) {
      mag = `~${lossRateMatch[1]}`.replace('~~', '~');
    } else if (/total losses|loss of returns/i.test(snippet)) {
      mag = 'Total lost circulation';
      severity = 'CRITICAL';
    } else if (/partial losses|seepage/i.test(snippet)) {
      mag = 'Partial seepage';
      severity = 'MEDIUM';
    }
  } else if (eventType === 'STUCK_PIPE') {
    const overpullMatch = snippet.match(/(\d+(?:\.\d+)?\s*(?:tonnes?|t|klbs|lbs)\s*overpull)/i);
    const workedFree = /worked free/i.test(snippet);
    if (overpullMatch) {
      mag = overpullMatch[1] + (workedFree ? ', worked free' : '');
    } else if (workedFree) {
      mag = 'Worked free';
      severity = 'MEDIUM';
    } else {
      mag = 'Differential sticking';
      severity = 'CRITICAL';
    }
  } else if (eventType === 'TORQUE_SPIKE') {
    const torqueMatch = snippet.match(/(?:erratic\s*torque|torque\s*(?:increased\s*from|across)?\s*)?(\d+(?:\.\d+)?\s*(?:to|-|–)\s*\d+(?:\.\d+)?\s*kNm|\d+(?:\.\d+)?\s*kNm)/i);
    if (torqueMatch) {
      mag = `torque ${torqueMatch[1]}`;
    }
    severity = 'MEDIUM';
  } else if (eventType === 'KICK') {
    const gainMatch = snippet.match(/(\d+(?:\.\d+)?\s*(?:bbl|m3)\s*(?:pit\s*)?gain)/i);
    if (gainMatch) mag = gainMatch[1];
    severity = 'CRITICAL';
  } else if (eventType === 'OVERPRESSURE') {
    severity = 'HIGH';
    mag = 'High pore pressure anomaly';
  }

  return { magnitude: mag, severity };
}

/**
 * Extracts mitigation phrase or sentences
 */
function extractMitigation(snippet: string, _fullText?: string): string {
  // Direct label
  const labelMatch = snippet.match(/Mitigation(?:\s*applied)?\s*:\s*([^.\n;]+(?:[.\n;][^.\n;]+)?)/i);
  if (labelMatch) {
    return labelMatch[1].trim();
  }

  // Look for known mitigation keywords in snippet
  const matchedMitigations: string[] = [];
  if (/lcm pill/i.test(snippet)) {
    const lcmDetail = snippet.match(/(?:spotted|pumped)?\s*(?:a\s*)?(?:[0-9]+-bbl\s*)?(?:mixed\s*)?(?:coarse\/medium\s*)?LCM pill\s*(?:\([^)]+\))?/i);
    if (lcmDetail) matchedMitigations.push(lcmDetail[0].trim());
    else matchedMitigations.push('LCM pill treatment');
  }

  if (/mud weight/i.test(snippet)) {
    const mwMatch = snippet.match(/mud weight (?:raised|increased)?\s*[\d.]+\s*(?:to|-)\s*[\d.]+\s*sg/i);
    if (mwMatch) matchedMitigations.push(mwMatch[0].trim());
  }

  if (/wiper trip/i.test(snippet)) {
    matchedMitigations.push('wiper trip');
  }

  if (/circulated bottoms up/i.test(snippet)) {
    matchedMitigations.push('circulated bottoms up');
  }

  if (/reamed/i.test(snippet)) {
    matchedMitigations.push('reamed tight interval');
  }

  if (/connection standstill/i.test(snippet)) {
    const csMatch = snippet.match(/connection standstill under \d+ (?:min|minutes)/i);
    if (csMatch) matchedMitigations.push(csMatch[0].trim());
  }

  if (matchedMitigations.length > 0) {
    return matchedMitigations.join(', ');
  }

  return '';
}

/**
 * Main Rule-Based NLP Parser
 */
export function parseDrillingReport(
  rawText: string,
  fileName: string = 'Report.pdf',
  pageNumber: number = 1
): ParseResult {
  const wellId = extractWellId(rawText, fileName) || 'UNKNOWN_WELL';
  const formationTable = extractFormationTable(rawText);

  // Extract header formation (e.g. Formation: F3 (Base transition))
  const headerFormMatch = rawText.match(/(?:formation|lithology)[\s:]*([A-Za-z0-9_-]+(?:\s+(?:Shale|Sandstone|Sand|Formation|Limestone|Claystone))?)/i);
  const headerFormation = headerFormMatch ? headerFormMatch[1].trim() : undefined;

  // Extract report total depth or current depth if present
  const tdMatch = rawText.match(/(?:current depth|total depth|TD)[\s:]*(\d{3,5})\s*m/i);
  const reportTotalDepth = tdMatch ? cleanNumber(tdMatch[1]) : null;

  // Extract document-level Root Cause & Mitigation if present
  const docCauseMatch = rawText.match(/Root Cause\s*:\s*([^\r\n]+)/i);
  const docCause = docCauseMatch ? docCauseMatch[1].trim() : '';

  const docMitigationMatch = rawText.match(/Mitigation(?:\s*applied)?\s*:\s*([^\r\n]+)/i);
  const docMitigation = docMitigationMatch ? docMitigationMatch[1].trim() : '';

  // Split text into lines, trimming whitespace
  const rawLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Filter out pure header or table definition lines
  const formationLines = new Set<string>();
  formationTable.forEach(entry => {
    rawLines.forEach(line => {
      if (line.includes(entry.formation) && (line.includes('Table') || line.match(/\d+\s*(?:m)?\s*(?:to|-|–)\s*\d+\s*m/i))) {
        formationLines.add(line);
      }
    });
  });

  // Group lines into operational entries
  interface LogEntry {
    text: string;
    associatedMitigation?: string;
    associatedCause?: string;
  }
  const logEntries: LogEntry[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    // Skip formation table lines and pure header titles
    if (
      formationLines.has(line) ||
      /^Formation (?:Lithology )?Table/i.test(line) ||
      /^DAILY DRILLING REPORT/i.test(line) ||
      /^Report Date/i.test(line) ||
      /^Formation:/i.test(line) ||
      /^Operations Summary/i.test(line)
    ) {
      continue;
    }

    // Skip standalone metadata lines
    if (/^Root Cause\s*:/i.test(line) || /^Mitigation(?:\s*applied)?\s*:/i.test(line)) {
      continue;
    }

    // Check if subsequent lines have Cause or Mitigation
    let associatedMitigation: string | undefined;
    let associatedCause: string | undefined;

    for (let j = i + 1; j < Math.min(rawLines.length, i + 3); j++) {
      if (/^Mitigation(?:\s*applied)?\s*:/i.test(rawLines[j])) {
        associatedMitigation = rawLines[j].replace(/^Mitigation(?:\s*applied)?\s*:\s*/i, '').trim();
      }
      if (/^Root Cause\s*:/i.test(rawLines[j])) {
        associatedCause = rawLines[j].replace(/^Root Cause\s*:\s*/i, '').trim();
      }
    }

    logEntries.push({
      text: line,
      associatedMitigation,
      associatedCause
    });
  }

  const detectedEvents: ExtractedEventItem[] = [];

  // Evaluate log entries against synonym dictionary
  for (const entry of logEntries) {
    const chunk = entry.text;

    for (const [eventTypeKey, synonyms] of Object.entries(EVENT_SYNONYMS) as [ExtractedEventItem['event_type'], string[]][]) {
      const matchedSynonym = synonyms.find(syn => {
        const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(chunk);
      });

      if (matchedSynonym) {
        const { depth, depthEnd, isFallback } = extractDepthInfo(chunk, reportTotalDepth);

        // Avoid adding duplicate events within 5m and same type
        const isDuplicate = detectedEvents.some(
          e => e.event_type === eventTypeKey && Math.abs(e.depth_m - depth) < 5
        );
        if (isDuplicate) continue;

        // Extract formation
        const formation = resolveFormation(chunk, depth, formationTable, headerFormation);

        // Magnitude and severity
        const { magnitude, severity } = extractMagnitude(chunk, eventTypeKey);

        // Mitigation
        let mitigation = '';
        if (eventTypeKey === 'STUCK_PIPE' && /worked free/i.test(chunk)) {
          const wfMatch = chunk.match(/worked (?:string )?worked free(?: after \d+ (?:min|minutes))?/i);
          mitigation = wfMatch ? wfMatch[0] : 'worked free';
        } else {
          mitigation = entry.associatedMitigation || extractMitigation(chunk, rawText) || docMitigation;
        }

        const cause = entry.associatedCause || docCause || `${matchedSynonym} encountered at ${depth || 'target'}m interval`;

        // Confidence calculation
        let confidence = 0.55;
        if (matchedSynonym) confidence += 0.15;
        if (!isFallback && depth > 0) confidence += 0.15;
        if (formation && formation !== 'Unknown Formation') confidence += 0.08;
        if (magnitude) confidence += 0.05;
        if (mitigation) confidence += 0.05;
        if (isFallback) confidence -= 0.25;

        confidence = Math.max(0.2, Math.min(0.96, Number(confidence.toFixed(2))));

        detectedEvents.push({
          id: `ev-${Date.now()}-${detectedEvents.length + 1}`,
          event_type: eventTypeKey,
          depth_m: depth || 3800,
          depth_m_end: depthEnd,
          formation,
          severity,
          magnitude: magnitude || 'Reported incident',
          mitigation: mitigation || 'Standard well control procedure',
          cause,
          description: chunk.slice(0, 220),
          source_file: fileName,
          source_page: pageNumber,
          source_text_snippet: chunk.slice(0, 180),
          confidence
        });
      }
    }
  }

  // Sort events by depth
  detectedEvents.sort((a, b) => a.depth_m - b.depth_m);

  return {
    wellId,
    events: detectedEvents,
    formationTable,
    rawText
  };
}
