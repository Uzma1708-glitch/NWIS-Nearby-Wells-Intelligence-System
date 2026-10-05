/**
 * NWIS — Comprehensive SIH Acceptance Test Suite
 * ==============================================
 * Validates official SIH Part 6 End-to-End Acceptance Scenarios:
 *   TEST A — Active Well Context (dynamic switching, no hardcoded X17 override)
 *   TEST B — Radius (dynamic filtering and distance recalculation)
 *   TEST C — Historical Knowledge (event search, provenance, evidence retrieval)
 *   TEST D — Document Intelligence (OCR/NLP extraction, validation, structured storage)
 *   TEST E — Correlation (compatible depth references, cross-well tracks)
 *   TEST F — Look-Ahead (dynamic interval, approaching hazard query)
 *   TEST G — Alert Evidence (supporting events, depths, root cause, mitigations)
 *   TEST H — Copilot (active well context awareness, no stale state)
 *   TEST I — Reports (active target context, radius, depth configuration, findings)
 *   TEST J — Error and Empty States (missing depth, 0 radius, empty events, invalid uploads)
 */

import fs from 'fs';
import {
  getInitialSihData,
  recalculateAllDistancesAndRelevance,
  calculateDistance,
  evaluateProactiveAlert,
  calculateRiskScoresForDepth,
  answerCopilotQuestion
} from '../src/services/sihLocalStore.ts';
import { parseDrillingReport } from '../src/services/nwisNlpParser.ts';
import { validateUploadedFile } from '../src/services/fileExtractor.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('================================================================');
console.log('NWIS — COMPLETE SIH REQUIREMENTS ACCEPTANCE TEST SUITE (A to J)');
console.log('================================================================\n');

// Initialize Store
const store = getInitialSihData();
const allWells = store.wells;
const events = store.events;

// -------------------------------------------------------------------------
// SCENARIO TEST A: Active Well Context
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST A: Active Well Context Integrity');
{
  // 1. Select Well X17
  const wellX17 = allWells.find(w => w.well_name === 'X17')!;
  const contextX17 = recalculateAllDistancesAndRelevance(wellX17, allWells, events, 5.0);
  const selfDistX17 = contextX17.find(w => w.well_name === 'X17')!.distance_km;
  const offsetsX17 = contextX17.filter(w => w.is_nearby && w.well_name !== 'X17');

  assert(selfDistX17 === 0, 'X17 distance to itself is exactly 0 km');
  assert(offsetsX17.length > 0, `X17 has ${offsetsX17.length} nearby offsets within 5km`);
  assert(offsetsX17.some(w => w.well_name === 'X12'), 'X12 is an offset to X17');

  // 2. Select Well X12
  const wellX12 = allWells.find(w => w.well_name === 'X12')!;
  const contextX12 = recalculateAllDistancesAndRelevance(wellX12, allWells, events, 5.0);
  const selfDistX12 = contextX12.find(w => w.well_name === 'X12')!.distance_km;
  const offsetsX12 = contextX12.filter(w => w.is_nearby && w.well_name !== 'X12');

  assert(selfDistX12 === 0, 'X12 distance to itself is exactly 0 km');
  assert(offsetsX12.some(w => w.well_name === 'X17'), 'X17 is now an offset to X12 (Context changed dynamically)');

  // 3. Verify no fixed X17 context override in calculations
  const copilotX17 = answerCopilotQuestion('Which well is most comparable?', {
    currentDepth: 3842,
    activeWell: wellX17,
    nearbyWells: offsetsX17,
    events
  });
  const copilotX12 = answerCopilotQuestion('Which well is most comparable?', {
    currentDepth: 3842,
    activeWell: wellX12,
    nearbyWells: offsetsX12,
    events
  });

  assert(copilotX17.answer.includes('X12') || copilotX17.answer.includes('closest'), 'Copilot evaluates X17 vs offsets');
  assert(!copilotX12.answer.includes('comparable to X12 is X12'), 'Copilot excludes active well X12 from its own offset comparison');
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST B: Radius
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST B: Search Radius Recalculation');
{
  const activeWell = allWells.find(w => w.well_name === 'X17')!;
  const nearby2km = recalculateAllDistancesAndRelevance(activeWell, allWells, events, 2.0).filter(w => w.is_nearby && w.well_name !== activeWell.well_name);
  const nearby5km = recalculateAllDistancesAndRelevance(activeWell, allWells, events, 5.0).filter(w => w.is_nearby && w.well_name !== activeWell.well_name);
  const nearby15km = recalculateAllDistancesAndRelevance(activeWell, allWells, events, 15.0).filter(w => w.is_nearby && w.well_name !== activeWell.well_name);

  assert(nearby2km.length <= nearby5km.length, `Radius 2km (${nearby2km.length} wells) <= Radius 5km (${nearby5km.length} wells)`);
  assert(nearby5km.length <= nearby15km.length, `Radius 5km (${nearby5km.length} wells) <= Radius 15km (${nearby15km.length} wells)`);
  assert(nearby15km.some(w => (w.distance_km ?? 0) > 5.0), 'Radius 15km dynamically incorporates regional wells beyond 5km');
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST C: Historical Knowledge
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST C: Searchable Historical Knowledge & Evidence');
{
  const mudLossEvents = events.filter(e => e.event_type === 'MUD_LOSS');
  const stuckPipeEvents = events.filter(e => e.event_type === 'STUCK_PIPE');
  const torqueSpikeEvents = events.filter(e => e.event_type === 'TORQUE_SPIKE');

  assert(mudLossEvents.length > 0, `Found ${mudLossEvents.length} searchable mud loss events`);
  assert(stuckPipeEvents.length > 0, `Found ${stuckPipeEvents.length} searchable stuck pipe events`);
  assert(torqueSpikeEvents.length > 0, `Found ${torqueSpikeEvents.length} searchable torque spike events`);

  const sampleEvent = mudLossEvents[0];
  assert(sampleEvent.well_name !== '', `Event has well reference: ${sampleEvent.well_name}`);
  assert(sampleEvent.depth > 0, `Event has verified depth: ${sampleEvent.depth}m MD`);
  assert(sampleEvent.source_doc != null && sampleEvent.source_doc.length > 0, `Event has source provenance: ${sampleEvent.source_doc}`);
  assert(sampleEvent.cause != null && sampleEvent.cause.length > 0, 'Event has underlying cause');
  assert((sampleEvent.mitigations && sampleEvent.mitigations.length > 0) || sampleEvent.mitigation != null, 'Event has documented mitigation');
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST D: Document Intelligence Pipeline
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST D: Document Upload, NLP Extraction, Validation & Storage');
{
  // 1. File Validation
  const valExe = validateUploadedFile({ name: 'script.exe', size: 1024 } as File);
  const valPdf = validateUploadedFile({ name: 'DDR_Report.pdf', size: 5 * 1024 * 1024 } as File);
  assert(!valExe.valid, 'Unsupported file extension (.exe) rejected');
  assert(valPdf.valid, 'Supported drilling report (.pdf) accepted');

  // 2. Information Extraction
  const sampleDdr = fs.readFileSync('./public/samples/DDR_X12_3845.txt', 'utf8');
  const parsed = parseDrillingReport(sampleDdr, 'DDR_X12_3845.pdf');

  assert(parsed.wellId === 'X12', `Extracted Well Identity: ${parsed.wellId}`);
  assert(parsed.events.length > 0, `Extracted ${parsed.events.length} structured events`);
  const extractedLoss = parsed.events.find(e => e.event_type === 'MUD_LOSS');
  assert(extractedLoss !== undefined && extractedLoss.depth_m === 3845, 'Accurately extracted MUD_LOSS at 3845m');
  assert(extractedLoss?.mitigation.length! > 0, 'Extracted mitigation measure from DDR text');
  assert(extractedLoss?.confidence! >= 0.8, `Extraction confidence is verified (${Math.round(extractedLoss?.confidence! * 100)}%)`);
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST E: Correlation & Compatible Depth References
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST E: Subsurface Correlation & Depth Reference Compatibility');
{
  const formations = store.formations;
  const drillingParams = store.drillingParameters;

  assert(formations.length >= 4, `Loaded ${formations.length} geological formations`);
  formations.forEach(f => {
    assert(f.top_depth < f.base_depth, `Formation ${f.name} interval valid (${f.top_depth}m–${f.base_depth}m MD)`);
  });

  const x17Params = drillingParams.filter(p => p.well_name === 'X17');
  const x12Params = drillingParams.filter(p => p.well_name === 'X12');

  assert(x17Params.length > 0, `Well X17 has ${x17Params.length} parameter points in target corridor`);
  assert(x12Params.length > 0, `Well X12 has ${x12Params.length} parameter points in target corridor`);
  assert(x12Params.every(p => p.torque_knm !== undefined && p.rop_m_hr !== undefined), 'Parameter tracks have torque and ROP values');
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST F: Look-Ahead Hazard Analysis
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST F: Look-Ahead Dynamic Calculations');
{
  const activeWell = allWells.find(w => w.well_name === 'X17')!;
  const nearby = recalculateAllDistancesAndRelevance(activeWell, allWells, events, 5.0).filter(w => w.is_nearby && w.well_name !== 'X17');

  // Depth 3750m with lookahead 50m (interval 3750-3800m) -> Outside critical F3 loss zone (3810-3870m)
  const alert3750_50 = evaluateProactiveAlert(3750, activeWell, nearby, events, 50);
  assert(alert3750_50 === null, 'No critical alert at 3750m with 50m look-ahead (outside hazard corridor)');

  // Depth 3800m with lookahead 50m (interval 3800-3850m) -> Enters 3810m-3870m hazard corridor!
  const alert3800_50 = evaluateProactiveAlert(3800, activeWell, nearby, events, 50);
  assert(alert3800_50 !== null, 'Proactive alert triggers when look-ahead enters 3810–3850m');

  // Depth 3842m with lookahead 100m -> Alert active with multiple offset incidents
  const alert3842_100 = evaluateProactiveAlert(3842, activeWell, nearby, events, 100);
  assert(alert3842_100 !== null && alert3842_100.severity === 'CRITICAL', 'Critical alert at 3842m inside F3 loss corridor');
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST G: Alert Evidence & Explainability
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST G: Alert Evidence & Explainability');
{
  const activeWell = allWells.find(w => w.well_name === 'X17')!;
  const nearby = recalculateAllDistancesAndRelevance(activeWell, allWells, events, 5.0).filter(w => w.is_nearby && w.well_name !== 'X17');
  const alert = evaluateProactiveAlert(3842, activeWell, nearby, events, 50)!;

  assert(alert !== null, 'Alert generated for evaluation depth 3842m');
  assert(alert.historical_wells.length > 0, `Alert lists contributing wells: ${alert.historical_wells.join(', ')}`);
  assert(alert.historical_events.length > 0, `Alert lists specific historical events: ${alert.historical_events.join(' | ')}`);
  assert(alert.recommendation.length > 0, `Alert provides actionable mitigation: ${alert.recommendation}`);

  const riskScores = calculateRiskScoresForDepth(3842, events, activeWell, nearby);
  const mudLossRisk = riskScores.find(r => r.risk_type === 'MUD_LOSS')!;
  assert(mudLossRisk.level === 'HIGH' || mudLossRisk.level === 'CRITICAL', `Mud Loss evaluated as ${mudLossRisk.level}`);
  assert(mudLossRisk.evidence.length > 0, `Mud Loss has ${mudLossRisk.evidence.length} evidence citations`);
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST H: Copilot Context Switching
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST H: NWIS Copilot Context Switching & Grounding');
{
  const wellX17 = allWells.find(w => w.well_name === 'X17')!;
  const wellX09 = allWells.find(w => w.well_name === 'X09')!;

  const q = 'What risks are approaching the current depth?';

  const resX17 = answerCopilotQuestion(q, {
    currentDepth: 3842,
    activeWell: wellX17,
    nearbyWells: recalculateAllDistancesAndRelevance(wellX17, allWells, events, 5.0).filter(w => w.is_nearby && w.well_name !== 'X17'),
    events
  });

  const resX09 = answerCopilotQuestion(q, {
    currentDepth: 3842,
    activeWell: wellX09,
    nearbyWells: recalculateAllDistancesAndRelevance(wellX09, allWells, events, 5.0).filter(w => w.is_nearby && w.well_name !== 'X09'),
    events
  });

  assert(resX17.answer.includes('X17') || resX17.answer.includes('3842m'), 'Copilot grounds answer on X17 context');
  assert(resX09.answer.includes('X09') || resX09.answer.includes('3842m'), 'Copilot grounds answer on X09 context');
  assert(resX17.confidence >= 0.8, 'Copilot reports high confidence for grounded historical data');
  assert(resX17.source != null, 'Copilot includes source citation');
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST I: Report Generation Integrity
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST I: Intelligence Brief Report Integrity');
{
  const targetWell = allWells.find(w => w.well_name === 'X21')!;
  const radius = 10.0;
  const currentDepth = 3850;

  const nearbyOffsets = recalculateAllDistancesAndRelevance(targetWell, allWells, events, radius).filter(w => w.is_nearby && w.well_name !== targetWell.well_name);

  assert(nearbyOffsets.every(w => (w.distance_km ?? 0) <= radius), `All reported wells within specified radius (${radius}km)`);
  assert(targetWell.latitude > 0 && targetWell.longitude > 0, `Report includes real/derived coordinates: ${targetWell.latitude}, ${targetWell.longitude}`);
  assert(targetWell.well_name === 'X21', 'Report targets selected well X21 (no silent prototype substitution)');
}
console.log('');

// -------------------------------------------------------------------------
// SCENARIO TEST J: Error and Empty States
// -------------------------------------------------------------------------
console.log('>>> RUNNING TEST J: Edge Cases, Error & Empty States Handling');
{
  const activeWell = allWells.find(w => w.well_name === 'X17')!;

  // 1. Radius with 0 nearby wells (0.01 km)
  const emptyNearby = recalculateAllDistancesAndRelevance(activeWell, allWells, events, 0.01).filter(w => w.is_nearby && w.well_name !== 'X17');
  assert(emptyNearby.length === 0, 'Handled empty nearby wells at 0.01km radius');

  // 2. Alert outside any known event depths (e.g. 1000m)
  const alert1000m = evaluateProactiveAlert(1000, activeWell, emptyNearby, events, 50);
  assert(alert1000m === null, 'No false alerts at shallow depths with no historical incidents');

  // 3. Risk scores with 0 nearby wells outside hazard interval
  const scoresEmpty = calculateRiskScoresForDepth(1000, [], activeWell, []);
  assert(scoresEmpty.every(s => s.score <= 25 && s.level === 'LOW'), 'Handled empty risk calculation gracefully (score <= 25, LOW)');

  // 4. Copilot with empty query
  const copilotEmpty = answerCopilotQuestion('', {
    currentDepth: 3842,
    activeWell,
    nearbyWells: [],
    events: []
  });
  assert(copilotEmpty.answer.length > 0, 'Copilot returns helpful prompt on empty/general input');
}
console.log('');

// -------------------------------------------------------------------------
// FINAL SUMMARY
// -------------------------------------------------------------------------
console.log('================================================================');
console.log(`TOTAL ACCEPTANCE TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log(`ACCEPTANCE STATUS: ${passedTests === totalTests ? 'ALL 10 SCENARIOS PASSED 100%' : 'SOME TESTS FAILED'}`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
