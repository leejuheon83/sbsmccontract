/**
 * 실제 Word 세그먼트와 편집기 추출 텍스트를 가지고 매칭 시뮬레이션
 */

function normalizeForMatch(text) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\s""\u201C\u201D\u2018\u2019<>\[\]()（）「」『』]+/g, '')
    .toLowerCase();
}

function stripLeadingNumber(text) {
  return text.replace(/^\d{1,3}\s*[.)）．]\s*/u, '');
}

function longestCommonSubstringLen(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  let prev = new Uint16Array(short.length + 1);
  let curr = new Uint16Array(short.length + 1);
  let best = 0;
  for (let i = 1; i <= long.length; i++) {
    for (let j = 1; j <= short.length; j++) {
      if (long[i - 1] === short[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > best) best = curr[j];
      } else {
        curr[j] = 0;
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return best;
}

// Word segment texts (from original)
const segTexts = [
  '[프로그램명]', '[프로그램명]', '[2026. 00]', '[광고주법인명]', '<프로그램명>',
  '[간접광고, 라이선스 사용권 상품을]',
  '1. 간접광고 : "SBS"가 "광고주" 에게 판매하는 간접광고로써 방송법 제73조 제2항 제6호 및 제7호에 규정된 방송광고를 의미한다.',
  '2. 디지털 브랜디드 콘텐츠 : 브랜드 맞춤 디지털 콘텐츠를 별도로 제작 및 업로드하는 협찬을 의미한다.',
  '3. 유튜브 브랜디드 클립ID : "SBS" 유튜브 채널에 업로드 되는 특정 클립의 ID에 "광고주" 브랜드 협찬을 고지하는 유형의 디지털 협찬을 의미한다.',
  '4. SMR 클립 업로드 : "SBS" SMR 채널에 "프로그램" 방송 클립 업로드를 의미한다.',
  '5. 라이선스 패키지 : "SBS"가 "광고주"에게 판매하는 간접광고, 제작협찬, "프로그램" IP, 디지털 클립 업로드 등을 결합하여 2개 이상으로 구성된 패키지 상품을 의미한다.',
  'SBS-TV <프로그램명>', '2026년 0월',
  '제 5 조 (마케팅 라이선스 패키지)',
  '"광고주"를 대행하는 "미디어렙"이 "SBS"로부터 구매하는 라이선스 패키지는 아래와 같다.',
  '라이선스 패키지', '금액 (VAT 별도)', '비고',
  '예시-SMR클립 업로드 (1회)',
  '협찬', '(SMR)', 'SBS -> 미디어렙',
];

// Simulated HTML extraction (user reordered items in editor with new numbers)
const replacements = [
  '1. 라이선스 패키지 : "SBS"가 "광고주"에게 판매하는 간접광고, 제작협찬, "프로그램" IP, 디지털 클립 업로드 등을 결합하여 2개 이상으로 구성된 패키지 상품을 의미한다.',
  '2. SMR 클립 업로드 : "SBS" SMR 채널에 "프로그램" 방송 클립 업로드를 의미한다.',
  '3. 간접광고 : "SBS"가 "광고주" 에게 판매하는 간접광고로써 방송법 제73조 제2항 제6호 및 제7호에 규정된 방송광고를 의미한다.',
  '4. 디지털 브랜디드 콘텐츠 : 브랜드 맞춤 디지털 콘텐츠를 별도로 제작 및 업로드하는 협찬을 의미한다.',
  '5. 유튜브 브랜디드 클립ID : "SBS" 유튜브 채널에 업로드 되는 특정 클립의 ID에 "광고주" 브랜드 협찬을 고지하는 유형의 디지털 협찬을 의미한다.',
];

const segNorms = segTexts.map(t => normalizeForMatch(stripLeadingNumber(t)));
const replNorms = replacements.map(t => normalizeForMatch(stripLeadingNumber(t)));

const candidates = [];
for (let si = 0; si < segNorms.length; si++) {
  const sn = segNorms[si];
  if (sn.length === 0) continue;
  for (let ri = 0; ri < replNorms.length; ri++) {
    const rn = replNorms[ri];
    if (rn.length === 0) continue;
    const overlap = longestCommonSubstringLen(sn, rn);
    const longer = Math.max(sn.length, rn.length);
    const score = longer > 0 ? overlap / longer : 0;
    if (score >= 0.4) {
      candidates.push({ si, ri, score });
    }
  }
}

candidates.sort((a, b) => b.score - a.score);
const usedSeg = new Set();
const usedRepl = new Set();
const result = new Map();

for (const c of candidates) {
  if (usedSeg.has(c.si) || usedRepl.has(c.ri)) continue;
  result.set(c.si, c.ri);
  usedSeg.add(c.si);
  usedRepl.add(c.ri);
}

console.log('=== MATCHING RESULT ===');
for (const [si, ri] of [...result.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`Seg ${si} -> Repl ${ri}`);
  console.log(`  Word: "${segTexts[si].substring(0, 80)}"`);
  console.log(`  HTML: "${replacements[ri].substring(0, 80)}"`);
}

console.log('\n=== UNMATCHED SEGMENTS (keep original) ===');
for (let i = 0; i < segTexts.length; i++) {
  if (!result.has(i)) {
    console.log(`Seg ${i}: "${segTexts[i].substring(0, 80)}"`);
  }
}

console.log('\n=== UNMATCHED REPLACEMENTS (lost!) ===');
for (let i = 0; i < replacements.length; i++) {
  if (!usedRepl.has(i)) {
    console.log(`Repl ${i}: "${replacements[i].substring(0, 80)}"`);
  }
}
