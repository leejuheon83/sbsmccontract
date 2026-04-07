import { describe, expect, it } from 'vitest';
import {
  canPerformContractReviewByDepartment,
  canPerformLegalReview,
  defaultReviewForVer,
} from './versionReviewPolicy';

describe('canPerformLegalReview', () => {
  it('법무·관리자만 true', () => {
    expect(canPerformLegalReview('legal')).toBe(true);
    expect(canPerformLegalReview('admin')).toBe(true);
    expect(canPerformLegalReview('sales')).toBe(false);
  });
});

describe('canPerformContractReviewByDepartment', () => {
  it('경영지원팀만 true', () => {
    expect(canPerformContractReviewByDepartment('경영지원팀')).toBe(true);
    expect(canPerformContractReviewByDepartment('영업1팀')).toBe(false);
    expect(canPerformContractReviewByDepartment(' 광고기획팀 ')).toBe(false);
  });
});

describe('defaultReviewForVer', () => {
  it('맵에 없으면 pending', () => {
    expect(defaultReviewForVer({}, 'v1.0')).toBe('pending');
  });
  it('맵 값을 반환', () => {
    expect(
      defaultReviewForVer({ 'v1.0': 'approved', 'v1.1': 'rejected' }, 'v1.1'),
    ).toBe('rejected');
  });
});
