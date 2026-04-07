/**
 * HTML email helpers for contract delivery notifications.
 * Uses table layout + inline styles for broad client compatibility.
 */

export type ContractDeliveryTemplateParams = {
  /** Display name for greeting (falls back if empty) */
  recipientName: string;
  contractTitle: string;
  companyName: string;
  /** Primary CTA — must be absolute https URL when provided */
  contractUrl: string | null;
};

const DEFAULT_RECIPIENT_LABEL = '고객님';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildContractDeliverySubject(
  params: Pick<ContractDeliveryTemplateParams, 'contractTitle' | 'companyName'>,
): string {
  const title = params.contractTitle.trim();
  const company = params.companyName.trim();
  return `[계약서 안내] ${title} — ${company}`;
}

/**
 * Full HTML body for “contract delivered / please review” style mail.
 */
export function buildContractDeliveryHtml(
  params: ContractDeliveryTemplateParams,
): string {
  const name =
    params.recipientName.trim() || DEFAULT_RECIPIENT_LABEL;
  const title = escapeHtml(params.contractTitle.trim());
  const company = escapeHtml(params.companyName.trim());
  const safeName = escapeHtml(name);

  const intro =
    '아래 계약서를 확인해 주시기 바랍니다. 내용에 이상이 있으면 담당자에게 연락 주세요.';

  const buttonSection = params.contractUrl
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td align="center" bgcolor="#1E40AF" style="border-radius:8px;">
            <a href="${escapeHtml(params.contractUrl)}"
               style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              계약서 확인하기
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#64748b;line-height:1.5;">
        버튼이 동작하지 않으면 아래 주소를 브라우저에 붙여 넣으세요.<br/>
        <a href="${escapeHtml(params.contractUrl)}" style="color:#1E40AF;word-break:break-all;">${escapeHtml(params.contractUrl)}</a>
      </p>
    `
    : `
      <p style="margin:24px 0 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#64748b;line-height:1.6;">
        계약서 확인 링크는 별도 채널로 안내드리거나, 담당자에게 문의해 주세요.
      </p>
    `;

  const footer = `
    본 메일은 발신 전용입니다. 회신으로는 처리가 되지 않을 수 있습니다.<br/>
    문의: 내부 계약·법무 담당자 또는 시스템 관리자에게 연락해 주세요.
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
                안녕하세요, <strong>${safeName}</strong>님
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.65;">
                ${escapeHtml(intro)}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;background-color:#f8fafc;">
                <tr>
                  <td style="padding:16px 18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#0f172a;">
                    <div style="margin-bottom:10px;"><span style="color:#64748b;">계약서 제목</span><br/><strong style="font-size:15px;">${title}</strong></div>
                    <div><span style="color:#64748b;">회사명</span><br/><strong style="font-size:15px;">${company}</strong></div>
                  </td>
                </tr>
              </table>
              ${buttonSection}
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                ${footer}
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
