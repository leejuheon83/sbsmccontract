/**
 * Request body for POST /api/send-contract
 */
export type SendContractRequestBody = {
  /** Normalized recipient list */
  to: string[];
  contractTitle: string;
  companyName: string;
  /** Optional — defaults in template */
  recipientName?: string;
  /** Optional absolute URL for CTA */
  contractUrl?: string;
};

export type ValidationIssue = { field: string; message: string };

/** Practical max length guards */
const LIMITS = {
  contractTitle: 500,
  companyName: 200,
  recipientName: 120,
  contractUrl: 2048,
} as const;

/**
 * RFC 5322–inspired pattern: good enough for API validation; not a full RFC parser.
 */
const EMAIL_PATTERN =
  /^(?:[a-zA-Z0-9_'^&+/=?{|}~.-]+)@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

export function isValidEmailAddress(email: string): boolean {
  const t = email.trim();
  if (t.length === 0 || t.length > 254) return false;
  if (!EMAIL_PATTERN.test(t)) return false;
  const [local, domain] = t.split('@');
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  return true;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

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

export function validateSendContractBody(
  body: unknown,
): { ok: true; data: SendContractRequestBody } | { ok: false; issues: ValidationIssue[] } {
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

  if (!isNonEmptyString(raw.contractTitle)) {
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

  if (!isNonEmptyString(raw.companyName)) {
    issues.push({
      field: 'companyName',
      message: 'companyName은 필수 문자열입니다.',
    });
  } else if (raw.companyName.length > LIMITS.companyName) {
    issues.push({
      field: 'companyName',
      message: `companyName은 ${LIMITS.companyName}자 이하여야 합니다.`,
    });
  }

  let recipientName: string | undefined;
  if (raw.recipientName !== undefined) {
    if (typeof raw.recipientName !== 'string') {
      issues.push({
        field: 'recipientName',
        message: 'recipientName은 문자열이어야 합니다.',
      });
    } else if (raw.recipientName.length > LIMITS.recipientName) {
      issues.push({
        field: 'recipientName',
        message: `recipientName은 ${LIMITS.recipientName}자 이하여야 합니다.`,
      });
    } else {
      recipientName = raw.recipientName;
    }
  }

  let contractUrl: string | undefined;
  if (raw.contractUrl !== undefined) {
    if (typeof raw.contractUrl !== 'string' || !raw.contractUrl.trim()) {
      issues.push({
        field: 'contractUrl',
        message: 'contractUrl은 비어 있지 않은 문자열이어야 합니다.',
      });
    } else if (raw.contractUrl.length > LIMITS.contractUrl) {
      issues.push({
        field: 'contractUrl',
        message: `contractUrl은 ${LIMITS.contractUrl}자 이하여야 합니다.`,
      });
    } else if (!isHttpsUrl(raw.contractUrl.trim())) {
      issues.push({
        field: 'contractUrl',
        message: 'contractUrl은 https:// 로 시작하는 절대 URL이어야 합니다.',
      });
    } else {
      contractUrl = raw.contractUrl.trim();
    }
  }

  if (issues.length) return { ok: false, issues };

  const data: SendContractRequestBody = {
    to: recipients!,
    contractTitle: (raw.contractTitle as string).trim(),
    companyName: (raw.companyName as string).trim(),
    recipientName,
    contractUrl,
  };

  return { ok: true, data };
}
