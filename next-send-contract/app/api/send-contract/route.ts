import { NextResponse } from 'next/server';
import {
  buildContractDeliveryHtml,
  buildContractDeliverySubject,
} from '@/lib/emailTemplates';
import { getResendClient, getResendFromEmail } from '@/lib/resend';
import { validateSendContractBody } from '@/lib/validateSendContract';

export const runtime = 'nodejs';

type SuccessResponse = {
  success: true;
  messageId: string | null;
};

type ErrorResponse = {
  success: false;
  error: string;
  details?: Array<{ field: string; message: string }>;
  code?: string;
};

function buildPlainTextBody(params: {
  recipientName: string;
  contractTitle: string;
  companyName: string;
  contractUrl: string | null;
}): string {
  const name = params.recipientName.trim() || '고객님';
  const lines = [
    `안녕하세요, ${name}님`,
    '',
    '아래 계약서를 확인해 주시기 바랍니다.',
    '',
    `계약서 제목: ${params.contractTitle}`,
    `회사명: ${params.companyName}`,
    '',
    params.contractUrl
      ? `확인 링크: ${params.contractUrl}`
      : '확인 링크는 별도로 안내드립니다.',
    '',
    '본 메일은 발신 전용입니다.',
  ];
  return lines.join('\n');
}

function resolveContractUrl(explicit?: string): string | null {
  if (explicit?.trim()) return explicit.trim();
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/contracts`;
}

export async function POST(request: Request): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '요청 본문이 올바른 JSON이 아닙니다.' },
        { status: 400 },
      );
    }

    const validated = validateSendContractBody(raw);
    if (!validated.ok) {
      return NextResponse.json(
        {
          success: false,
          error: '입력값 검증에 실패했습니다.',
          details: validated.issues,
        },
        { status: 400 },
      );
    }

    const { to, contractTitle, companyName, recipientName, contractUrl } =
      validated.data;

    const toList = to;
    const href = resolveContractUrl(contractUrl);

    const templateParams = {
      recipientName: recipientName ?? '',
      contractTitle,
      companyName,
      contractUrl: href,
    };

    const html = buildContractDeliveryHtml(templateParams);
    const subject = buildContractDeliverySubject({
      contractTitle,
      companyName,
    });
    const text = buildPlainTextBody({
      recipientName: recipientName ?? '',
      contractTitle,
      companyName,
      contractUrl: href,
    });

    const resend = getResendClient();
    const from = getResendFromEmail();

    // [DB] 발송 전 기록(권장): outbox / notification_log 테이블에 저장
    // 예: await db.insertEmailOutbox({ to: toList, subject, templateKey: 'contract-delivery', bodySnapshot: { contractTitle, companyName }, status: 'pending' })

    const { data, error } = await resend.emails.send({
      from,
      to: toList,
      subject,
      html,
      text,
    });

    if (error) {
      // [DB] 실패 상태 반영
      // await db.updateEmailOutbox({ status: 'failed', providerError: error.message })
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'RESEND_ERROR',
        },
        { status: 502 },
      );
    }

    // [DB] 성공 시 provider 메시지 ID와 함께 'sent'로 갱신
    // await db.updateEmailOutbox({ status: 'sent', providerMessageId: data?.id })

    return NextResponse.json(
      {
        success: true,
        messageId: data?.id ?? null,
      },
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL' },
      { status: 500 },
    );
  }
}
