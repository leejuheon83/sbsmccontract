import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function LoginPage() {
  const loginWithEmployee = useAppStore((s) => s.loginWithEmployee);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const r = await loginWithEmployee(employeeId, password);
      if (!r.ok) setFormError(r.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <img
              src="/sbs-mc-logo.png"
              alt="SBS M&C"
              className="h-10 w-auto max-w-[200px] object-contain"
              decoding="async"
            />
            <div>
              <h1 className="text-lg font-bold text-neutral-900">
                계약서 자동화
              </h1>
              <p className="mt-1 text-[13px] text-neutral-500">
                관리자가 등록한 사번·비밀번호로만 로그인할 수 있습니다.
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="login-employee-id"
                className="mb-1 block text-xs font-medium text-neutral-600"
              >
                사번
              </label>
              <input
                id="login-employee-id"
                name="employeeId"
                type="text"
                autoComplete="username"
                inputMode="text"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  setFormError(null);
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none ring-primary-500/0 transition-shadow focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="예: EMP001"
                disabled={busy}
                required
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-xs font-medium text-neutral-600"
              >
                비밀번호
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError(null);
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="비밀번호"
                disabled={busy}
                required
              />
            </div>

            {formError ? (
              <p
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900"
                role="alert"
              >
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary-800 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {busy ? '확인 중…' : '로그인'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-neutral-400">
            비밀번호 분실 시 내부 관리자에게 문의하세요.
            <br />
            운영 환경에서는 SSO 또는 사내 인증 API와 연동할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
