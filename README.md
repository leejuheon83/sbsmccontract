# ContractOS — 계약서 자동 작성 플랫폼

> SBS 방송 계약서 자동 작성·검토·관리 내부 플랫폼

---

## 빠른 시작

```bash
# 프로토타입 바로 실행 (설치 없음)
open index.html        # macOS
start index.html       # Windows
```

브라우저에서 `index.html`을 열면 전체 UI가 즉시 동작합니다.

---

## 프로젝트 구조

```
contractos/
├── .cursorrules              ← Cursor AI 프로젝트 규칙 (자동 인식)
├── README.md
│
├── index.html                ← ★ 메인 프로토타입 (완전 동작 Vanilla HTML)
├── contract-filter.html      ← 계약 매트릭스 필터 페이지
│
└── src/                      ← React 마이그레이션 소스 (작업 예정)
    ├── types/
    │   └── contract.ts       ← TypeScript 타입 정의
    ├── data/
    │   ├── templates.ts      ← 장르×계약형태×계약서유형 매트릭스 데이터
    │   ├── clauses.ts        ← 표준 조항 데이터
    │   └── matrix.ts         ← 계약 매트릭스 (필터용 flat 데이터)
    └── components/           ← 컴포넌트 분리 예정
        ├── layout/
        │   ├── Topbar.tsx
        │   └── Sidebar.tsx
        ├── editor/
        │   ├── TemplateSelector.tsx   ← 3단계 선택 위저드
        │   ├── ClauseBlock.tsx        ← 조항 블록 (state별 스타일)
        │   └── AiPanel.tsx            ← AI 추천 패널
        └── shared/
            ├── StatusBadge.tsx
            └── VersionTimeline.tsx
```

---

## 화면 구성 (index.html)

상단 탭 버튼으로 모든 화면 전환 가능:

| 화면 | 설명 |
|------|------|
| **대시보드** | 역할별 업무 현황, StatCard, 최근 활동 피드 |
| **계약서 목록** | 검색·필터·상태탭, 데이터 테이블 |
| **새 계약서** | 4단계 생성 위저드 (Step Bar) |
| **계약서 편집기** | ★ 3단계 템플릿 선택 → 조항 편집 |
| **검토·승인** | 법무팀 읽기전용 뷰, 승인/반려 |
| **템플릿 관리** | 어드민 템플릿 카드 그리드 |
| **사용자 관리** | 어드민 사용자 테이블, 역할 관리 |

---

## 편집기 핵심 플로우

```
편집기 탭 클릭
  │
  ▼
① 장르 선택 카드 클릭
   교양 / 예능 / 드라마
  │
  ▼
② 계약형태 선택
   (장르별 동적 렌더: 2자계약 / 위수탁 계약 / 언진원 계약)
  │
  ▼
③ 계약서 유형 선택
   (해당 조합에 존재하는 유형만 활성화)
   협찬 계약서 / 마케팅 라이선스 / 대행 계약서 / 정부 계약서
  │
  ▼
"이 템플릿으로 편집 시작" 클릭
  │
  ▼
표준 조항 로드 + 편집기 진입
  · 조항 클릭 → 접기/펼치기
  · [편집] 버튼 → contentEditable 직접 수정
  · AI 제안 패널 → 수락(조항 삽입) / 거부
  · [저장] → 버전 자동 증가 + 감사 로그 기록
  · 우측 탭 → AI추천 / 버전이력 / 감사로그 전환
```

---

## 조항 상태 색상 규칙

| state | 배경 | 보더 | 뱃지 |
|-------|------|------|------|
| `approved` | bg-green-50 | border-green-300 | 승인됨 (초록) |
| `review` | bg-amber-50 | border-amber-300 | 검토 필요 (노랑) |
| `ai` | bg-blue-50 | border-blue-300 | AI 제안 (파랑) + 수락/거부 |

---

## 계약 매트릭스 (장르 × 계약형태 × 계약서유형)

| 장르 | 계약형태 | 계약 구분 | 계약서유형 |
|------|---------|-----------|---------|
| 교양 | 2자계약 | SBS-광고주/대행사 | 협찬 계약서 |
| 교양 | 2자계약 | SBS-MC | 대행 계약서 |
| 교양 | 위수탁 계약 | MC-협찬주 | 협찬 계약서 |
| 교양 | 언진원 계약 | SBS-언진 | 정부 계약서 |
| 예능 | 2자계약 | SBS-광고주/MC | 마케팅 라이선스 |
| 예능 | 위수탁 계약 | MC-협찬주 | 마케팅 라이선스 |
| 예능 | 위수탁 계약 | SBS-협찬주 | 협찬 계약서 |
| 예능 | 언진원 계약 | SBS-언진 | 마케팅 라이선스 |
| 드라마 | 준비중 | — | — |

---

## RBAC 권한

| 기능 | Sales | Legal | Admin |
|------|:-----:|:-----:|:-----:|
| 계약서 생성·편집 | ✅ | ❌ | ✅ |
| 조항 편집·AI 수락 | ✅ | ❌ | ✅ |
| 검토 완료·반려 | ❌ | ✅ | ✅ |
| 템플릿 관리 | ❌ | ❌ | ✅ |
| 사용자 관리 | ❌ | ❌ | ✅ |
| 감사 로그 전체 | ❌ | ❌ | ✅ |

---

## React 마이그레이션 가이드

```bash
# 1. Vite 프로젝트 생성
npm create vite@latest contractos-react -- --template react-ts
cd contractos-react

# 2. 의존성 설치
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. tailwind.config.js — 커스텀 토큰 추가
#    (src/data/tailwind.config.example.js 참고)

# 4. index.html의 TEMPLATES 데이터 → src/data/templates.ts 로 이동
# 5. 컴포넌트 순서: AppShell → TemplateSelector → ClauseBlock → AiPanel
```

---

## 주요 TODO

- [ ] Vite + React + TS 세팅
- [ ] Tailwind 커스텀 색상 토큰
- [ ] TemplateSelector (3단계 위저드)
- [ ] ClauseBlock (state별 스타일 + contentEditable → controlled)
- [ ] AiPanel (수락 시 clauses 배열에 추가)
- [ ] 버전 관리 (Zustand store)
- [ ] 감사 로그 (이벤트 기반)
- [ ] 계약 매트릭스 필터 통합
- [ ] 백엔드 API 연동
- [ ] JWT + RBAC 라우트 가드
