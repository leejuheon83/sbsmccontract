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

/**
 * Build a .docx Blob from current draft content (browser download).
 */
export async function buildContractDocxBlob(params: {
  documentTitle: string;
  templateLabel: string;
  versionLabel: string;
  clauses: Clause[];
}): Promise<Blob> {
  const titleLine =
    params.documentTitle.trim() || params.templateLabel;

  const children: Paragraph[] = [
    new Paragraph({
      text: titleLine,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `템플릿: ${params.templateLabel} · 버전 ${params.versionLabel}`,
          italics: true,
          size: 20,
        }),
      ],
      spacing: { after: 300 },
    }),
  ];

  for (const c of params.clauses) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${c.num} ${c.title}`, bold: true }),
          new TextRun({ text: `  (${stateLabel(c.state)})`, italics: true }),
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
          children: [new TextRun({ text: line || ' ', size: 22 })],
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
