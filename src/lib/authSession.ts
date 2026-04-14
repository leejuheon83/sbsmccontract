const STORAGE_KEY = 'contractos-auth-session';

export type AuthSessionPayload = {
  employeeId: string;
  loggedInAt: string;
};

export function loadAuthSession(): AuthSessionPayload | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      !data ||
      typeof data !== 'object' ||
      typeof (data as AuthSessionPayload).employeeId !== 'string'
    ) {
      return null;
    }
    const employeeId = (data as AuthSessionPayload).employeeId.trim();
    if (!employeeId) return null;
    return {
      employeeId,
      loggedInAt:
        typeof (data as AuthSessionPayload).loggedInAt === 'string'
          ? (data as AuthSessionPayload).loggedInAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveAuthSession(payload: AuthSessionPayload): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearAuthSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
