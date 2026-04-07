// tailwind.config.js
// React 마이그레이션 시 사용할 Tailwind 설정
// npm create vite@latest 후 이 파일을 프로젝트 루트에 배치

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // ContractOS 브레이크포인트
    screens: {
      mobile:  '320px',
      tablet:  '768px',
      desktop: '1024px',
      wide:    '1440px',
    },
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', 'Pretendard', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // ── Primary (Blue) ──────────────────────
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',  // ← 메인 CTA
          900: '#1E3A8A',
        },
        // ── Success (Green) — 승인됨, approved ──
        success: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          300: '#86EFAC',
          500: '#22C55E',
          700: '#15803D',
          900: '#14532D',
        },
        // ── Warning (Amber) — 검토 필요, review ─
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          300: '#FCD34D',
          500: '#F59E0B',
          700: '#B45309',
          900: '#78350F',
        },
        // ── Danger (Red) — 거부, 오류 ───────────
        danger: {
          50:  '#FFF5F5',
          100: '#FEE2E2',
          300: '#FCA5A5',
          500: '#EF4444',
          700: '#B91C1C',
          900: '#7F1D1D',
        },
        // ── Info (Blue) — AI 제안, ai 조항 ──────
        info: {
          50:  '#F0F9FF',
          100: '#E0F2FE',
          300: '#7DD3FC',
          500: '#0EA5E9',
          700: '#0369A1',
          900: '#0C4A6E',
        },
        // ── Neutral (Slate) ─────────────────────
        neutral: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
      },
      // ── 사이드바·탑바 레이아웃 ────────────────
      width: {
        sidebar: '240px',
      },
      height: {
        topbar: '56px',
      },
    },
  },
  plugins: [],
};
