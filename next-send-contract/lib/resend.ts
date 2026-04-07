import { Resend } from 'resend';

let client: Resend | null = null;

/**
 * Lazily constructs a singleton Resend client.
 * Throws if `RESEND_API_KEY` is missing (fail fast at send time, not import time).
 */
export function getResendClient(): Resend {
  if (client) return client;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Missing RESEND_API_KEY. Add it to your environment before sending mail.',
    );
  }

  client = new Resend(apiKey);
  return client;
}

/**
 * Verified-domain From header, e.g. `ContractOS <noreply@yourdomain.com>`.
 */
export function getResendFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error(
      'Missing RESEND_FROM_EMAIL. Use a verified sender in Resend.',
    );
  }
  return from;
}
