import { Resend } from "resend";

export const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@tierstack.dev";
export const SITE_NAME = "tierstack.dev";

// Lazily instantiated so the constructor doesn't run at build/module-eval time
// before env vars are injected.
let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}
