/** index.html `saveVersion`과 동일한 표시 버전 증가 규칙 */
export function bumpTemplateVersion(current: string): string {
  const num = parseFloat(current.replace(/[^0-9.]/g, '')) || 0;
  const prefix = current.replace(/[\d.]+/, '') || 'v';
  return prefix + (num + 0.1).toFixed(1);
}
