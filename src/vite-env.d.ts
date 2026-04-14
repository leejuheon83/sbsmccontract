/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Next `notify-review-request` API 전체 URL */
  readonly VITE_NOTIFY_REVIEW_API_URL?: string;
  /** 쉼표/세미콜론 구분 수신 메일 (경영지원팀 등) */
  readonly VITE_REVIEW_NOTIFY_TO?: string;
  /** 프로덕션 앱 https URL — 검토 화면 링크에 사용 */
  readonly VITE_PUBLIC_APP_URL?: string;
  /** 서버 NOTIFY_SECRET 과 동일 시에만 설정 */
  readonly VITE_NOTIFY_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
