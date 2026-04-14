import { useEffect, useMemo, useState } from 'react';
import type { User } from '../../types/contract';
import { USER_DEPARTMENTS } from '../../lib/userDepartments';
import { validateEmployeeIdFormat } from '../../lib/employeeLogin';

type Mode = 'create' | 'edit';

const MIN_PASSWORD_LEN = 4;

export type UserUpsertPayload = {
  name: string;
  email: string;
  department: string;
  isActive: boolean;
  employeeId: string;
  /** 생성 시 필수. 수정 시 비우면 기존 비밀번호 유지 */
  loginPassword?: string;
};

export function UserUpsertModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: Mode;
  initial: User | null;
  onClose: () => void;
  onSubmit: (payload: UserUpsertPayload) => boolean | void | Promise<boolean | void>;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<string>(USER_DEPARTMENTS[0]!);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => {
    return mode === 'create' ? '사용자 추가' : '사용자 수정';
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setEmployeeId(initial.employeeId);
      setLoginPassword('');
      setName(initial.name);
      setEmail(initial.email);
      const dep = initial.department.trim();
      setDepartment(
        (USER_DEPARTMENTS as readonly string[]).includes(dep)
          ? dep
          : USER_DEPARTMENTS[0]!,
      );
      setIsActive(initial.isActive);
      return;
    }
    setEmployeeId('');
    setLoginPassword('');
    setName('');
    setEmail('');
    setDepartment(USER_DEPARTMENTS[0]!);
    setIsActive(true);
  }, [open, mode, initial]);

  if (!open) return null;

  const empErr = validateEmployeeIdFormat(employeeId.trim());
  const passwordOkCreate =
    loginPassword.trim().length >= MIN_PASSWORD_LEN;
  const passwordOkEdit =
    loginPassword.trim().length === 0 ||
    loginPassword.trim().length >= MIN_PASSWORD_LEN;

  const canSubmit =
    !empErr &&
    name.trim().length > 0 &&
    email.trim().includes('@') &&
    department.trim().length > 0 &&
    !submitting &&
    (mode === 'create' ? passwordOkCreate : passwordOkEdit);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: UserUpsertPayload = {
        name: name.trim(),
        email: email.trim(),
        department: department.trim(),
        isActive,
        employeeId: employeeId.trim(),
        ...(mode === 'create'
          ? { loginPassword: loginPassword.trim() }
          : loginPassword.trim()
            ? { loginPassword: loginPassword.trim() }
            : {}),
      };
      const res = await Promise.resolve(onSubmit(payload));
      if (res === false) return;
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-upsert-title"
        className="w-full max-w-lg overflow-y-auto rounded-[10px] border border-neutral-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="user-upsert-title" className="text-lg font-bold text-neutral-900">
          {title}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          등록된 사번·비밀번호로만 로그인할 수 있습니다. (로컬 저장)
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="uu-emp" className="text-xs font-medium text-neutral-700">
              사번 (로그인 ID) <span className="text-danger-700">*</span>
            </label>
            <input
              id="uu-emp"
              className={`rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 ${
                empErr ? 'border-danger-400' : 'border-neutral-300 focus:border-primary-500'
              }`}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              autoComplete="off"
            />
            {empErr ? (
              <p className="text-[11px] text-danger-700">{empErr}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="uu-pw" className="text-xs font-medium text-neutral-700">
              로그인 비밀번호{' '}
              {mode === 'create' ? (
                <span className="text-danger-700">*</span>
              ) : (
                <span className="font-normal text-neutral-400">(변경 시만 입력)</span>
              )}
            </label>
            <input
              id="uu-pw"
              type="password"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder={mode === 'create' ? `${MIN_PASSWORD_LEN}자 이상` : '비우면 기존 유지'}
              autoComplete="new-password"
            />
            <p className="text-[11px] text-neutral-400">
              로컬 데모는 평문 저장입니다. 운영 시 서버 인증으로 교체하세요.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="uu-name" className="text-xs font-medium text-neutral-700">
              이름 <span className="text-danger-700">*</span>
            </label>
            <input
              id="uu-name"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="uu-email" className="text-xs font-medium text-neutral-700">
              이메일 <span className="text-danger-700">*</span>
            </label>
            <input
              id="uu-email"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="uu-department" className="text-xs font-medium text-neutral-700">
              부서 <span className="text-danger-700">*</span>
            </label>
            <select
              id="uu-department"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {USER_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="uu-status" className="text-xs font-medium text-neutral-700">
              상태
            </label>
            <select
              id="uu-status"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="rounded-md bg-primary-800 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === 'create' ? '추가' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
