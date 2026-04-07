export default function HomePage() {
  return (
    <main>
      <h1 style={{ fontSize: 20 }}>next-send-contract</h1>
      <p style={{ color: '#64748b', maxWidth: 560 }}>
        계약서 안내 메일은{' '}
        <code style={{ background: '#f1f5f9', padding: '2px 6px' }}>
          POST /api/send-contract
        </code>
        로 발송합니다. 환경 변수를 설정한 뒤{' '}
        <code style={{ background: '#f1f5f9', padding: '2px 6px' }}>
          npm run dev
        </code>
        를 실행하세요.
      </p>
    </main>
  );
}
