import { isValidEmailAddress } from './validateSendContract';

export type NotifyReviewRequestBody = {
  to: string[];
  contractTitle: string;
  templateLabel: string;
  reviewUrl?: string;
  submittedBy?: string;
};

export type ValidationIssue = { field: string; message: string };

const LIMITS = {
  contractTitle: 500,
  templateLabel: 300,
  submittedBy: 80,
  reviewUrl: 2048,
} as const;

function normalizeRecipients(to: unknown): string[] | null {
  if (typeof to === 'string') {
    const parts = to
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length ? parts : null;
  }
  if (Array.isArray(to)) {
    const out = to
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
    return out.length ? out : null;
  }
  return null;
}

function isHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateNotifyReviewBody(
  body: unknown,
):
  | { ok: true; data: NotifyReviewRequestBody }
  | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      issues: [{ field: 'body', message: 'JSON 객체가 필요합니다.' }],
    };
  }

  const raw = body as Record<string, unknown>;

  const recipients = normalizeRecipients(raw.to);
  if (!recipients) {
    issues.push({ field: 'to', message: '수신 이메일(to)이 필요합니다.' });
  } else {
    for (const addr of recipients) {
      if (!isValidEmailAddress(addr)) {
        issues.push({
          field: 'to',
          message: `유효하지 않은 이메일 주소: ${addr}`,
        });
        break;
      }
    }
  }

  if (typeof raw.contractTitle !== 'string' || !raw.contractTitle.trim()) {
    issues.push({
      field: 'contractTitle',
      message: 'contractTitle은 필수 문자열입니다.',
    });
  } else if (raw.contractTitle.length > LIMITS.contractTitle) {
    issues.push({
      field: 'contractTitle',
      message: `contractTitle은 ${LIMITS.contractTitle}자 이하여야 합니다.`,
    });
  }

  if (typeof raw.templateLabel !== 'string' || !raw.templateLabel.trim()) {
    issues.push({
      field: 'templateLabel',
      message: 'templateLabel은 필수 문자열입니다.',
    });
  } else if (raw.templateLabel.length > LIMITS.templateLabel) {
    issues.push({
      field: 'templateLabel',
      message: `templateLabel은 ${LIMITS.templateLabel}자 이하여야 합니다.`,
    });
  }

  let submittedBy: string | undefined;
  if (raw.submittedBy !== undefined) {
    if (typeof raw.submittedBy !== 'string') {
      issues.push({
        field: 'submittedBy',
        message: 'submittedBy은 문자열이어야 합니다.',
      });
    } else if (raw.submittedBy.length > LIMITS.submittedBy) {
      issues.push({
        field: 'submittedBy',
        message: `submittedBy은 ${LIMITS.submittedBy}자 이하여야 합니다.`,
      });
    } else {
      submittedBy = raw.submittedBy.trim() || undefined;
    }
  }

  let reviewUrl: string | undefined;
  if (raw.reviewUrl !== undefined) {
    if (typeof raw.reviewUrl !== 'string' || !raw.reviewUrl.trim()) {
      issues.push({
        field: 'reviewUrl',
        message: 'reviewUrl은 비어 있지 않은 문자열이어야 합니다.',
      });
    } else if (raw.reviewUrl.length > LIMITS.reviewUrl) {
      issues.push({
        field: 'reviewUrl',
        message: `reviewUrl은 ${LIMITS.reviewUrl}자 이하여야 합니다.`,
      });
    } else if (!isHttpsUrl(raw.reviewUrl.trim())) {
      issues.push({
        field: 'reviewUrl',
        message: 'reviewUrl은 https:// 로 시작하는 절대 URL이어야 합니다.',
      });
    } else {
      reviewUrl = raw.reviewUrl.trim();
    }
  }

  if (issues.length) return { ok: false, issues };

  const data: NotifyReviewRequestBody = {
    to: recipients!,
    contractTitle: (raw.contractTitle as string).trim(),
    templateLabel: (raw.templateLabel as string).trim(),
    submittedBy,
    reviewUrl,
  };

  return { ok: true, data };
}
