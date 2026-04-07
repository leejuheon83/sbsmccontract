import type {
  ContractDocType,
  ContractFormType,
  Genre,
} from '../../types/contract';
import type { TemplateTone } from '../../types/managedTemplate';
import { DOC_OPTIONS } from '../../data/templates';

export const LINK_GENRES: { value: '' | Genre; label: string }[] = [
  { value: '', label: '선택 안 함' },
  { value: '교양', label: '교양' },
  { value: '예능', label: '예능' },
  { value: '드라마', label: '드라마' },
];

const DOC_TYPE_KEYS = Object.keys(DOC_OPTIONS) as ContractDocType[];

export const LINK_DOCS: { value: '' | ContractDocType; label: string }[] = [
  { value: '', label: '선택 안 함' },
  ...DOC_TYPE_KEYS.map((d) => ({ value: d, label: d })),
];

export const LINK_FORMS: { value: '' | ContractFormType; label: string }[] = [
  { value: '', label: '선택 안 함' },
  { value: '2자계약', label: '2자 계약' },
  { value: '위수탁 계약', label: '위수탁 계약' },
  { value: '언진원 계약', label: '언진원 계약' },
];

export const TONE_OPTIONS: { value: TemplateTone; label: string }[] = [
  { value: 'primary', label: '기본(파랑)' },
  { value: 'info', label: '정보(하늘)' },
  { value: 'success', label: '성공(녹색)' },
  { value: 'warning', label: '주의(앰버)' },
  { value: 'neutral', label: '중립(슬레이트)' },
];
