import { NextResponse } from 'next/server';
import {
  buildReviewRequestHtml,
  buildReviewRequestPlainText,
  buildReviewRequestSubject,
} from '@/lib/emailReviewRequestTemplates';
import { getResendClient, getResendFromEmail } from '@/lib/resend';
import { validateNotifyReviewBody } from '@/lib/validateNotifyReview';

export const runtime = 'nodejs';

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') ?? '';
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  const allowed = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  const allow =
    origin && allowed.includes(origin)
      ? origin
      : allowed[0] ?? '*';

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-ContractOS-Notify-Secret, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function verifyNotifySecret(request: Request): boolean {
  const expected = process.env.NOTIFY_SECRET?.trim();
  if (!expected) return true;
  const header = request.headers.get('x-contractos-notify-secret')?.trim();
  return header === expected;
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function POST(request: Request): Promise<NextResponse> {
  const cors = getCorsHeaders(request);

  if (!verifyNotifySecret(request)) {
    return NextResponse.json(
      { success: false, error: '인증에 실패했습니다.', code: 'UNAUTHORIZED' },
      { status: 401, headers: cors },
    );
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '요청 본문이 올바른 JSON이 아닙니다.' },
        { status: 400, headers: cors },
      );
    }

    const validated = validateNotifyReviewBody(raw);
    if (!validated.ok) {
      return NextResponse.json(
        {
          success: false,
          error: '입력값 검증에 실패했습니다.',
          details: validated.issues,
        },
        { status: 400, headers: cors },
      );
    }

    const d = validated.data;
    const templateParams = {
      contractTitle: d.contractTitle,
      templateLabel: d.templateLabel,
      reviewUrl: d.reviewUrl ?? null,
      submittedBy: d.submittedBy ?? null,
    };

    const html = buildReviewRequestHtml(templateParams);
    const subject = buildReviewRequestSubject(templateParams);
    const text = buildReviewRequestPlainText(templateParams);

    const resend = getResendClient();
    const from = getResendFromEmail();

    const { data, error } = await resend.emails.send({
      from,
      to: d.to,
      subject,
      html,
      text,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'RESEND_ERROR',
        },
        { status: 502, headers: cors },
      );
    }

    return NextResponse.json(
      { success: true, messageId: data?.id ?? null },
      { status: 200, headers: cors },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL' },
      { status: 500, headers: cors },
    );
  }
}
