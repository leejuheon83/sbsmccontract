import JSZip from 'jszip';
import type { IFontAttributesProperties } from 'docx';

export type TemplateRunDefaults = {
  font?: string | IFontAttributesProperties;
  /** OOXML half-points (same as docx `TextRun` `size`) */
  sizeHalfPoints?: number;
};

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeXmlAttr(raw: string, localName: string): string | undefined {
  const re = new RegExp(
    `\\bw:${localName}\\s*=\\s*(["'])([^"']*)\\1`,
    'i',
  );
  return raw.match(re)?.[2]?.trim();
}

function parseRPrInnerForFontsAndSize(rPrInner: string): TemplateRunDefaults {
  const rf = rPrInner.match(/<w:rFonts\b([^/>]*)\/?>/i)?.[1] ?? '';
  const ascii = decodeXmlAttr(rf, 'ascii');
  const hAnsi = decodeXmlAttr(rf, 'hAnsi');
  const eastAsia = decodeXmlAttr(rf, 'eastAsia');
  const cs = decodeXmlAttr(rf, 'cs');

  let font: string | IFontAttributesProperties | undefined;
  if (ascii || hAnsi || eastAsia || cs) {
    font = {
      ...(ascii ? { ascii } : {}),
      ...(hAnsi ? { hAnsi } : {}),
      ...(eastAsia ? { eastAsia } : {}),
      ...(cs ? { cs } : {}),
    };
  }

  const szMatch =
    rPrInner.match(/<w:sz\b[^>]*\bw:val\s*=\s*(["'])(\d+)\1/i) ??
    rPrInner.match(/<w:szCs\b[^>]*\bw:val\s*=\s*(["'])(\d+)\1/i);
  const sizeHalfPoints = szMatch?.[2]
    ? Number.parseInt(szMatch[2], 10)
    : undefined;

  const out: TemplateRunDefaults = {};
  if (font && Object.keys(font).length > 0) out.font = font;
  if (
    sizeHalfPoints !== undefined &&
    !Number.isNaN(sizeHalfPoints) &&
    sizeHalfPoints > 0
  ) {
    out.sizeHalfPoints = sizeHalfPoints;
  }
  return out;
}

/** `word/styles.xml`에서 문단 기본 `w:rPr` 블록 추출 */
export function extractRPrInnerFromStylesXml(stylesXml: string): string | null {
  const docDef = stylesXml.match(
    /<w:docDefaults>[\s\S]*?<\/w:docDefaults>/i,
  )?.[0];
  if (docDef) {
    const inner = docDef.match(
      /<w:rPrDefault>[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>/i,
    )?.[1];
    if (inner?.trim()) return inner;
  }

  const blocks = stylesXml.match(/<w:style\b[\s\S]*?<\/w:style>/gi) ?? [];
  for (const block of blocks) {
    if (!/<w:name\b[^>]*\bw:val\s*=\s*(["'])Normal\1/i.test(block)) continue;
    const inner = block.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/i)?.[1];
    if (inner?.trim()) return inner;
  }
  return null;
}

export function extractTemplateRunDefaultsFromStylesXml(
  stylesXml: string,
): TemplateRunDefaults | null {
  const rPr = extractRPrInnerFromStylesXml(stylesXml);
  if (!rPr) return null;
  const parsed = parseRPrInnerForFontsAndSize(rPr);
  if (!parsed.font && parsed.sizeHalfPoints === undefined) return null;
  return parsed;
}

/**
 * 첨부된 원본 .docx에서 기본 글꼴·글자 크기를 읽습니다 (폴백 Word 생성용).
 */
export async function extractTemplateRunDefaultsFromDocxBase64(
  originalDocxBase64: string,
): Promise<TemplateRunDefaults | null> {
  try {
    const zip = await JSZip.loadAsync(
      decodeBase64ToUint8Array(originalDocxBase64),
    );
    const f = zip.file('word/styles.xml');
    if (!f) return null;
    const xml = await f.async('string');
    return extractTemplateRunDefaultsFromStylesXml(xml);
  } catch {
    return null;
  }
}
