import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist';

function createSimplePdf(lines) {
  let stream = 'BT\n/F1 12 Tf\n50 750 Td\n16 TL\n';
  lines.forEach((l, i) => {
    const escaped = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    if (i === 0) stream += '(' + escaped + ') Tj\n';
    else stream += 'T* (' + escaped + ') Tj\n';
  });
  stream += 'ET';
  const len = Buffer.byteLength(stream, 'utf8');

  let o1 = '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n';
  let o2 = '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n';
  let o3 = '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n';
  let o4 = '4 0 obj << /Length ' + len + ' >> stream\n' + stream + '\nendstream\nendobj\n';
  let o5 = '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n';

  let head = '%PDF-1.4\n';
  let p1 = head.length;
  let p2 = p1 + o1.length;
  let p3 = p2 + o2.length;
  let p4 = p3 + o3.length;
  let p5 = p4 + o4.length;
  let pxref = p5 + o5.length;

  function pad(n) { return String(n).padStart(10, '0'); }

  let xref = 'xref\n0 6\n' +
    '0000000000 65535 f \n' +
    pad(p1) + ' 00000 n \n' +
    pad(p2) + ' 00000 n \n' +
    pad(p3) + ' 00000 n \n' +
    pad(p4) + ' 00000 n \n' +
    pad(p5) + ' 00000 n \n';

  let trailer = 'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n' + pxref + '\n%%EOF\n';

  return Buffer.from(head + o1 + o2 + o3 + o4 + o5 + xref + trailer);
}

const sampleLinesX09 = [
  'DAILY DRILLING REPORT - Well X09',
  'Report Date: 2024-04-12 | Current Depth: 3790 m MD | Basin: Assam-Arakan',
  'Formation Lithology Table:',
  'Barail Shale: 3700 m to 3820 m',
  'Operations Summary & Incident Log:',
  'At 3764 m depth in Barail Shale, severe mud loss observed with loss rate ~18 bbl/hr.',
  'Mitigation: Spotted LCM pill (CaCO3 25 ppb) to cure lost circulation.',
  'At 3772 m, experienced tight hole and stuck pipe condition with 18 tonnes overpull. Worked string worked free after 45 minutes.',
  'Drilling continued: torque spike observed across 3778 to 3790 m with erratic torque 17 to 26 kNm.',
  'Mitigation applied: mud weight raised 1.06 to 1.09 sg, conducted wiper trip, connection standstill under 10 minutes.'
];

fs.mkdirSync('./public/samples', { recursive: true });

const bufX09 = createSimplePdf(sampleLinesX09);
fs.writeFileSync('./public/samples/DDR_X09_3790.pdf', bufX09);
fs.writeFileSync('./public/samples/DDR_X09_3790.txt', sampleLinesX09.join('\n'));
console.log('Saved DDR_X09_3790.pdf and .txt to public/samples/');

// Also save DDR_X12_3845 sample
const sampleLinesX12 = [
  'DAILY DRILLING REPORT - Well X12',
  'Report Date: 2022-12-10 | Current Depth: 3845 m MD',
  'Formation: F3 (Base transition)',
  'Operations Summary:',
  'At 3845 m MD during rotary drilling, significant mud loss encountered. Loss rate ~25 bbl/hr with total lost circulation risk.',
  'Root Cause: Natural fracture network encountered at transition into F3 base.',
  'Mitigation: Pumped 50-bbl mixed coarse/medium LCM pill. Lowered flow rate to 1400 lpm to reduce downhole ECD to 1.08 sg.'
];
const bufX12 = createSimplePdf(sampleLinesX12);
fs.writeFileSync('./public/samples/DDR_X12_3845.pdf', bufX12);
fs.writeFileSync('./public/samples/DDR_X12_3845.txt', sampleLinesX12.join('\n'));
console.log('Saved DDR_X12_3845.pdf and .txt to public/samples/');

// Test pdfjs loading on the generated buffer
const docTask = pdfjsLib.getDocument({ data: new Uint8Array(bufX09) });
docTask.promise.then(async doc => {
  console.log('Successfully validated PDF with pdfjs! Pages:', doc.numPages);
  const p1 = await doc.getPage(1);
  const tc = await p1.getTextContent();
  console.log('Extracted lines count:', tc.items.length);
}).catch(console.error);
