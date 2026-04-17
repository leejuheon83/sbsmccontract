const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const origPath = path.join(__dirname, '..', '계약서', '2026 MC 표준 마케팅 계약서(SBS-MC)_2602.docx');
const exportPath = 'c:\\Users\\USER\\Downloads\\zzzz-v1.0.docx';

if (!fs.existsSync(exportPath)) {
  console.log('Export file not found:', exportPath);
  process.exit(1);
}

function extractText(raw) {
  const texts = [];
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
  let m;
  while ((m = re.exec(raw)) !== null) texts.push(m[1]);
  return texts.join('').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}

function runHasEditable(raw) {
  if (/<w:highlight\b[^>]*w:val=["']yellow["']/i.test(raw)) return true;
  const m = raw.match(/<w:shd\b[^>]*\bw:fill\s*=\s*["']([^"']+)["']/i);
  if (!m) return false;
  const fill = m[1].toUpperCase().replace(/^#/, '');
  return ['FFFF00','FFF2CC','FFC000','FEF08A','FDE68A','FEF3C7','FFF9C4','FFFF99'].includes(fill);
}

function getLeadingNum(text) {
  const m = text.replace(/\u00a0/g, ' ').trimStart().match(/^(\d{1,3})\s*[.)）．]/);
  return m ? parseInt(m[1], 10) : null;
}

function collectSegments(xml) {
  const runRe = /<w:r\b[\s\S]*?<\/w:r>/gi;
  const runs = [];
  let m;
  while ((m = runRe.exec(xml)) !== null) {
    runs.push({
      start: m.index, end: m.index + m[0].length, raw: m[0],
      isEditable: runHasEditable(m[0]),
      hasText: /<w:t\b[^>]*>[\s\S]*?<\/w:t>/i.test(m[0]),
    });
  }
  function hasBoundary(gap) { return /<\/w:p>|<w:br\b|<w:cr\b|<w:tab\b/i.test(gap); }
  const segments = [];
  let i = 0;
  while (i < runs.length) {
    const run = runs[i];
    if (!(run.isEditable && run.hasText)) { i++; continue; }
    const segStart = i;
    let segEnd = i;
    let segLeadNum = getLeadingNum(extractText(run.raw));
    while (segEnd + 1 < runs.length) {
      const next = runs[segEnd + 1];
      if (!next.isEditable || !next.hasText) break;
      if (hasBoundary(xml.slice(runs[segEnd].end, next.start))) break;
      const nextText = extractText(next.raw);
      const nextNum = getLeadingNum(nextText);
      if (nextNum !== null) {
        if (segLeadNum === null) segLeadNum = nextNum;
        else if (nextNum !== segLeadNum) break;
      }
      segEnd++;
    }
    let fullText = '';
    for (let j = segStart; j <= segEnd; j++) fullText += extractText(runs[j].raw);
    segments.push({ text: fullText.substring(0, 150) });
    i = segEnd + 1;
  }
  return segments;
}

async function analyze(filePath, label) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  const segs = collectSegments(xml);
  console.log(`\n=== ${label} (${segs.length} segments) ===`);
  segs.forEach((s, i) => {
    console.log(`  Seg ${i}: "${s.text}"`);
  });
  return segs;
}

(async () => {
  const origSegs = await analyze(origPath, 'ORIGINAL');
  const exportSegs = await analyze(exportPath, 'EXPORTED');
  
  console.log('\n=== DIFF (용어 정의 구간) ===');
  // Find segments starting with numbered items
  for (let i = 0; i < Math.max(origSegs.length, exportSegs.length); i++) {
    const o = origSegs[i]?.text ?? '(없음)';
    const e = exportSegs[i]?.text ?? '(없음)';
    if (o !== e) {
      console.log(`Seg ${i}:`);
      console.log(`  원본: "${o.substring(0,100)}"`);
      console.log(`  내보: "${e.substring(0,100)}"`);
    }
  }
})();
