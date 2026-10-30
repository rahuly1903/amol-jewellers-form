const { Resend } = require('resend');

const DEFAULT_TO = 'cre1.anmoljewellers@gmail.com';

let client;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function notifyAddress() {
  const fromEnv = String(process.env.ENQUIRY_TO_EMAIL || '').trim();
  return fromEnv || DEFAULT_TO;
}

function resendClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function mailConfigError() {
  if (!String(process.env.RESEND_API_KEY || '').trim()) {
    return 'Set RESEND_API_KEY before starting.';
  }
  if (!String(process.env.RESEND_FROM || '').trim()) {
    return 'Set RESEND_FROM before starting. Use an address on a domain verified in Resend.';
  }
  return '';
}

function submittedAt(enquiry) {
  if (!enquiry.createdAt) return '';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(enquiry.createdAt);
}

function buildEnquiryEmail(enquiry) {
  const comments = enquiry.comments
    ? escapeHtml(enquiry.comments).replace(/\n/g, '<br>')
    : '—';
  const page = enquiry.pageUrl
    ? `<a href="${escapeHtml(enquiry.pageUrl)}">${escapeHtml(enquiry.pageUrl)}</a>`
    : '—';
  const when = submittedAt(enquiry);

  const rows = [
    ['Name', escapeHtml(enquiry.name)],
    ['Mobile', escapeHtml(enquiry.phone)],
    ['Email', escapeHtml(enquiry.email)],
    ['Pincode', escapeHtml(enquiry.pincode)],
    ['Comments', comments],
    ['Page', page],
    ['Submitted', escapeHtml(when || '—')]
  ];

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f6f3ee;font-family:Georgia,serif;color:#1c1917;">
    <table role="presentation" style="max-width:560px;width:100%;background:#fff;border:1px solid #e7e0d6;padding:24px;">
      <tr>
        <td>
          <p style="margin:0 0 8px;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;color:#8a7e70;">Anmol Jewellers</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:normal;">New website enquiry</h1>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px;">
            ${rows
              .map(
                ([label, value]) => `<tr>
              <td style="padding:8px 12px 8px 0;color:#6b6258;vertical-align:top;width:110px;">${escapeHtml(label)}</td>
              <td style="padding:8px 0;vertical-align:top;">${value}</td>
            </tr>`
              )
              .join('')}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'New website enquiry',
    '',
    `Name: ${enquiry.name}`,
    `Mobile: ${enquiry.phone}`,
    `Email: ${enquiry.email}`,
    `Pincode: ${enquiry.pincode}`,
    `Comments: ${enquiry.comments || '—'}`,
    `Page: ${enquiry.pageUrl || '—'}`,
    `Submitted: ${when || '—'}`
  ].join('\n');

  return {
    subject: `New website enquiry from ${enquiry.name}`,
    html,
    text
  };
}

async function sendEnquiryEmail(enquiry) {
  const configError = mailConfigError();
  if (configError) throw new Error(configError);

  const { subject, html, text } = buildEnquiryEmail(enquiry);
  const { data, error } = await resendClient().emails.send(
    {
      from: String(process.env.RESEND_FROM).trim(),
      to: [notifyAddress()],
      replyTo: enquiry.email,
      subject,
      html,
      text
    },
    { idempotencyKey: `enquiry/${enquiry._id}` }
  );

  if (error) {
    const failure = new Error(error.message || 'Resend rejected the enquiry email');
    failure.details = error;
    throw failure;
  }

  return data;
}

module.exports = { sendEnquiryEmail, buildEnquiryEmail, mailConfigError };
