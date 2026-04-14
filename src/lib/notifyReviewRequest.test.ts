import { describe, expect, it } from 'vitest';
import { buildReviewPageUrlForEmail } from './notifyReviewRequest';

describe('buildReviewPageUrlForEmail', () => {
  it('https 베이스에 /review 경로를 붙임', () => {
    expect(buildReviewPageUrlForEmail('https://app.example.com')).toBe(
      'https://app.example.com/review',
    );
    expect(buildReviewPageUrlForEmail('https://app.example.com/')).toBe(
      'https://app.example.com/review',
    );
    expect(
      buildReviewPageUrlForEmail('https://app.example.com/base/'),
    ).toBe('https://app.example.com/base/review');
  });

  it('http 또는 빈 값은 null', () => {
    expect(buildReviewPageUrlForEmail('http://localhost:5173')).toBeNull();
    expect(buildReviewPageUrlForEmail('')).toBeNull();
    expect(buildReviewPageUrlForEmail(undefined)).toBeNull();
  });
});
