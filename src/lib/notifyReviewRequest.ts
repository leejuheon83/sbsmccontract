/**
 * 확정(검토 요청) 시 Resend API(Next 서버)로 경영지원팀 알림 메일을 보냅니다.
 * VITE_NOTIFY_REVIEW_API_URL · VITE_REVIEW_NOTIFY_TO 가 없으면 조용히 생략합니다.
 */

export type NotifyReviewResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; messageId: string | null }
  | { ok: false; error: string };

function parseRecipientList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 공개 앱 URL 기준 검토 페이지 https 링크 (로컬 http는 메일 본문에 넣지 않음) */
export function buildReviewPageUrlForEmail(publicAppUrl: string | undefined): string | null {
  const base = publicAppUrl?.trim();
  if (!base) return null;
  try {
    const u = new URL(base);
    if (u.protocol !== 'https:') return null;
    const path = u.pathname.replace(/\/$/, '');
    u.pathname = path ? `${path}/review` : '/review';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

export async function sendReviewRequestNotify(params: {
  contractDocumentTitle: string;
  templateLabel: string;
  submittedByEmployeeId: string | null;
}): Promise<NotifyReviewResult> {
  const apiUrl = import.meta.env.VITE_NOTIFY_REVIEW_API_URL?.trim();
  const toRaw = import.meta.env.VITE_REVIEW_NOTIFY_TO?.trim();
  const to = parseRecipientList(toRaw);

  if (!apiUrl || to.length === 0) {
    return { ok: true, skipped: true };
  }

  const publicUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const reviewUrl = buildReviewPageUrlForEmail(publicUrl);

  const secret = import.meta.env.VITE_NOTIFY_SECRET?.trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (secret) {
    headers['X-ContractOS-Notify-Secret'] = secret;
  }

  const contractTitle =
    params.contractDocumentTitle.trim() || params.templateLabel.trim() || '제목 없음';

  const body = {
    to,
    contractTitle,
    templateLabel: params.templateLabel.trim() || '—',
    ...(reviewUrl ? { reviewUrl } : {}),
    ...(params.submittedByEmployeeId?.trim()
      ? { submittedBy: params.submittedByEmployeeId.trim() }
      : {}),
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      mode: 'cors',
    });

    const json = (await res.json().catch(() => null)) as
      | { success?: boolean; messageId?: string | null; error?: string }
      | null;

    if (!res.ok || !json?.success) {
      const msg =
        json && typeof json.error === 'string'
          ? json.error
          : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      skipped: false,
      messageId: json.messageId ?? null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '네트워크 오류';
    return { ok: false, error: msg };
  }
}
