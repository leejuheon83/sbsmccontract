import { describe, expect, it } from 'vitest';
import { bumpTemplateVersion } from './bumpTemplateVersion';

describe('bumpTemplateVersion', () => {
  it('v 접두 + 숫자에 0.1을 더한다', () => {
    expect(bumpTemplateVersion('v2.3')).toBe('v2.4');
  });

  it('숫자만 있으면 v 접두를 쓴다', () => {
    expect(bumpTemplateVersion('1.0')).toBe('v1.1');
  });
});
