/**
 * Transactional email — SMTP via nodemailer when configured; logs in dev otherwise.
 */
let transporter = null;

function isConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function fromAddress() {
  return (
    process.env.SMTP_FROM ||
    process.env.MAIL_FROM ||
    `"KMM Lifestyle" <${process.env.SMTP_USER}>`
  );
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    const nodemailer = require("nodemailer");
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
async function sendMail(opts) {
  const to = String(opts.to || "").trim();
  if (!to) return { ok: false, error: "no_recipient" };

  const subject = String(opts.subject || "KMM Lifestyle");
  const text = String(opts.text || "");
  const html = opts.html || undefined;

  if (!isConfigured()) {
    console.log("[email] SMTP not configured — message logged only");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text}\n`);
    return { ok: true, devMode: true };
  }

  const transport = getTransporter();
  const info = await transport.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
  });

  return { ok: true, messageId: info.messageId };
}

module.exports = { sendMail, isConfigured, fromAddress };
