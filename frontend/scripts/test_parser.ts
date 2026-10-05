import fs from 'fs';
import { parseDrillingReport } from '../src/services/nwisNlpParser.ts';

// Test A: DDR_X09_3790
const x09Text = fs.readFileSync('./public/samples/DDR_X09_3790.txt', 'utf8');
console.log('=== TEST A: DDR_X09_3790 ===');
const resA = parseDrillingReport(x09Text, 'DDR_X09_3790.pdf');
console.log('Well ID:', resA.wellId);
console.log('Events count:', resA.events.length);
resA.events.forEach((ev, i) => {
  console.log(`[Event ${i+1}]`);
  console.log(`  Type: ${ev.event_type}`);
  console.log(`  Depth: ${ev.depth_m}m ${ev.depth_m_end ? '- ' + ev.depth_m_end + 'm' : ''}`);
  console.log(`  Formation: ${ev.formation}`);
  console.log(`  Magnitude: ${ev.magnitude}`);
  console.log(`  Mitigation: ${ev.mitigation}`);
  console.log(`  Confidence: ${ev.confidence}`);
});

// Test B: DDR_X12_3845
console.log('\n=== TEST B: DDR_X12_3845 ===');
const x12Text = fs.readFileSync('./public/samples/DDR_X12_3845.txt', 'utf8');
const resB = parseDrillingReport(x12Text, 'DDR_X12_3845.pdf');
console.log('Well ID:', resB.wellId);
console.log('Events count:', resB.events.length);
resB.events.forEach((ev, i) => {
  console.log(`[Event ${i+1}]`);
  console.log(`  Type: ${ev.event_type}`);
  console.log(`  Depth: ${ev.depth_m}m`);
  console.log(`  Formation: ${ev.formation}`);
  console.log(`  Magnitude: ${ev.magnitude}`);
  console.log(`  Mitigation: ${ev.mitigation}`);
  console.log(`  Confidence: ${ev.confidence}`);
});
