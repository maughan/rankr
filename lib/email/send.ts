// Server-only. Never import from client components.
import { getResend, FROM, SITE_NAME } from "./client";

interface ExportReadyOptions {
  to: string;
  downloadUrl: string;
  expiresAt: Date;
}

interface DeletionScheduledOptions {
  to: string;
  username: string;
  scheduledAt: Date;
  cancelUrl: string;
}

interface DeletionReminderOptions {
  to: string;
  username: string;
  scheduledAt: Date;
  cancelUrl: string;
  hoursLeft: number;
}

interface DeletionCancelledOptions {
  to: string;
  username: string;
}

interface DeletionCompletedOptions {
  to: string;
}

function fmt(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function html(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:sans-serif;background:#0A1220;color:#c9d1d9;margin:0;padding:32px}
    .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:32px;max-width:520px;margin:0 auto}
    h2{color:#f0f6fc;margin:0 0 16px}
    p{margin:0 0 12px;line-height:1.6;font-size:14px;color:#8b949e}
    a.btn{display:inline-block;margin-top:8px;padding:10px 20px;background:#4A8AE8;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500}
    a.btn.danger{background:#dc2626}
    .footer{margin-top:24px;font-size:11px;color:#484f58;text-align:center}
    hr{border:none;border-top:1px solid #1f2937;margin:20px 0}
  </style></head><body><div class="card">${body}<div class="footer">${SITE_NAME}</div></div></body></html>`;
}

export async function sendExportReady(opts: ExportReadyOptions) {
  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your data export is ready",
    html: html(`
      <h2>Your data export is ready</h2>
      <p>Your personal data archive is ready to download. The link expires on <strong>${fmt(opts.expiresAt)}</strong>.</p>
      <a class="btn" href="${opts.downloadUrl}">Download your data</a>
      <hr>
      <p>The archive contains your profile, lists, rankings, follows, and more — all in JSON format. If you need another copy after the link expires, you can request a new export from your account settings.</p>
    `),
  });
}

export async function sendDeletionScheduled(opts: DeletionScheduledOptions) {
  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your account is scheduled for deletion",
    html: html(`
      <h2>Account deletion scheduled</h2>
      <p>We received a request to permanently delete your ${SITE_NAME} account (<strong>@${opts.username}</strong>). Your account will be deleted on <strong>${fmt(opts.scheduledAt)}</strong>.</p>
      <p>Changed your mind? You have 30 days to cancel. After that, deletion is permanent and cannot be undone.</p>
      <a class="btn" href="${opts.cancelUrl}">Cancel deletion</a>
      <hr>
      <p>If you didn't request this, please reply to this email or contact us immediately.</p>
    `),
  });
}

export async function sendDeletionReminder(opts: DeletionReminderOptions) {
  const timeLabel = opts.hoursLeft <= 24 ? "tomorrow" : `in ${Math.round(opts.hoursLeft / 24)} days`;
  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `Reminder: your account deletes ${timeLabel}`,
    html: html(`
      <h2>Your account deletes ${timeLabel}</h2>
      <p>This is a reminder that your ${SITE_NAME} account (<strong>@${opts.username}</strong>) is scheduled for permanent deletion on <strong>${fmt(opts.scheduledAt)}</strong>.</p>
      <p>After that point, your account cannot be recovered. If you want to keep your account, cancel now.</p>
      <a class="btn danger" href="${opts.cancelUrl}">Cancel deletion</a>
    `),
  });
}

export async function sendDeletionCancelled(opts: DeletionCancelledOptions) {
  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: "Account deletion cancelled",
    html: html(`
      <h2>Deletion cancelled</h2>
      <p>Your ${SITE_NAME} account (<strong>@${opts.username}</strong>) has been restored. Everything is back to normal.</p>
      <p>If you didn't cancel this yourself, please reply to this email immediately.</p>
    `),
  });
}

export async function sendDeletionCompleted(opts: DeletionCompletedOptions) {
  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your account has been deleted",
    html: html(`
      <h2>Your account has been deleted</h2>
      <p>Your ${SITE_NAME} account has been permanently deleted. Your personal data has been removed from our systems.</p>
      <p>Some anonymised content (rankings on public lists) may be retained to preserve other users' data — it is no longer linked to your identity.</p>
      <p>Thank you for using ${SITE_NAME}.</p>
    `),
  });
}
