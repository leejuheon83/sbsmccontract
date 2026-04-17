import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { stripLeadingTitleFromBodyIfDuplicate } from './clausePlaceholders';
import { htmlClauseToPlainText } from './richClauseHtml';
import type { Clause } from '../types/contract';
import type { TemplateRunDefaults } from './templateDocxDefaults';

function stateLabel(state: Clause['state']): string {
  switch (state) {
    case 'approved':
      return '승인됨';
    case 'review':
      return '검토 필요';
    case 'ai':
      return 'AI 제안';
    default:
      return state;
  }
}

function metaLineSizeHalfPoints(defaults: TemplateRunDefaults | null | undefined): number {
  const base = defaults?.sizeHalfPoints ?? 22;
  return Math.max(16, base - 4);
}

function clauseBodyTextRun(
  line: string,
  defaults: TemplateRunDefaults | null | undefined,
): TextRun {
  const size = defaults?.sizeHalfPoints ?? 22;
  const font = defaults?.font;
  return new TextRun({
    text: line || ' ',
    size,
    ...(font ? { font } : {}),
  });
}

/**
 * Build a .docx Blob from current draft content (browser download).
 * `templateRunDefaults`가 있으면 원본 템플릿 `styles.xml`의 기본 글꼴·크기에 맞춥니다.
 */
export async function buildContractDocxBlob(params: {
  documentTitle: string;
  templateLabel: string;
  versionLabel: string;
  clauses: Clause[];
  templateRunDefaults?: TemplateRunDefaults | null;
}): Promise<Blob> {
  const d = params.templateRunDefaults ?? null;
  const titleLine =
    params.documentTitle.trim() || params.templateLabel;

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: titleLine,
          ...(d?.sizeHalfPoints ? { size: d.sizeHalfPoints } : {}),
          ...(d?.font ? { font: d.font } : {}),
        }),
      ],
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `템플릿: ${params.templateLabel} · 버전 ${params.versionLabel}`,
          italics: true,
          size: metaLineSizeHalfPoints(d),
          ...(d?.font ? { font: d.font } : {}),
        }),
      ],
      spacing: { after: 300 },
    }),
  ];

  for (const c of params.clauses) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${c.num} ${c.title}`,
            bold: true,
            ...(d?.sizeHalfPoints ? { size: d.sizeHalfPoints } : {}),
            ...(d?.font ? { font: d.font } : {}),
          }),
          new TextRun({
            text: `  (${stateLabel(c.state)})`,
            italics: true,
            ...(d?.sizeHalfPoints ? { size: d.sizeHalfPoints } : {}),
            ...(d?.font ? { font: d.font } : {}),
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
      }),
    );
    const bodyForExport = stripLeadingTitleFromBodyIfDuplicate(
      c.body,
      c.title,
    );
    const bodyText =
      c.bodyFormat === 'html'
        ? htmlClauseToPlainText(bodyForExport)
        : bodyForExport;
    const lines = bodyText.split(/\r?\n/);
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [clauseBodyTextRun(line, d)],
          spacing: { after: 80 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const safe = filename.replace(/[<>:"/\\|?*]/g, '_').slice(0, 180);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safe.endsWith('.docx') ? safe : `${safe}.docx`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
