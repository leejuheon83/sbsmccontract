export type ReviewRequestTemplateParams = {
  contractTitle: string;
  templateLabel: string;
  reviewUrl: string | null;
  submittedBy: string | null;
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildReviewRequestSubject(
  params: Pick<ReviewRequestTemplateParams, 'contractTitle'>,
): string {
  const title = params.contractTitle.trim();
  return `[계약서 검토 요청] ${title}`;
}

export function buildReviewRequestHtml(params: ReviewRequestTemplateParams): string {
  const title = escapeHtml(params.contractTitle.trim());
  const tmpl = escapeHtml(params.templateLabel.trim());
  const by = params.submittedBy?.trim()
    ? escapeHtml(params.submittedBy.trim())
    : '—';

  const buttonSection = params.reviewUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td align="center" bgcolor="#1E40AF" style="border-radius:8px;">
            <a href="${escapeHtml(params.reviewUrl)}"
               style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              검토 화면 열기
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#64748b;line-height:1.5;">
        링크: <a href="${escapeHtml(params.reviewUrl)}" style="color:#1E40AF;word-break:break-all;">${escapeHtml(params.reviewUrl)}</a>
      </p>
    `
    : `
      <p style="margin:24px 0 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#64748b;line-height:1.6;">
        ContractOS에서 「계약서 검토」메뉴로 접속해 검토 대기 건을 확인해 주세요.
      </p>
    `;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <p style="margin:0 0 8px;font-size:15px;color:#0f172a;line-height:1.5;">
                <strong>경영지원팀</strong> 담당자님
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.65;">
                영업 측에서 계약서를 <strong>확정</strong>하여 <strong>검토 단계(in_review)</strong>로 전달했습니다. ContractOS에서 검토를 진행해 주세요.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;background-color:#f8fafc;">
                <tr>
                  <td style="padding:16px 18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#0f172a;">
                    <div style="margin-bottom:10px;"><span style="color:#64748b;">계약서 제목</span><br/><strong style="font-size:15px;">${title}</strong></div>
                    <div style="margin-bottom:10px;"><span style="color:#64748b;">템플릿 유형</span><br/><strong style="font-size:15px;">${tmpl}</strong></div>
                    <div><span style="color:#64748b;">확정 요청자(사번)</span><br/><strong style="font-size:15px;">${by}</strong></div>
                  </td>
                </tr>
              </table>
              ${buttonSection}
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                본 메일은 ContractOS에서 자동 발송되었습니다. 발신 전용입니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildReviewRequestPlainText(params: ReviewRequestTemplateParams): string {
  const lines = [
    '경영지원팀 담당자님',
    '',
    '계약서가 확정되어 검토 단계로 전달되었습니다.',
    '',
    `계약서 제목: ${params.contractTitle.trim()}`,
    `템플릿 유형: ${params.templateLabel.trim()}`,
    `확정 요청자(사번): ${params.submittedBy?.trim() || '—'}`,
    '',
    params.reviewUrl
      ? `검토 화면: ${params.reviewUrl}`
      : 'ContractOS 「계약서 검토」메뉴에서 확인해 주세요.',
    '',
    '— ContractOS',
  ];
  return lines.join('\n');
}
