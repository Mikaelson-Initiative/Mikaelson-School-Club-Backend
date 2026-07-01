// src/lib/mailer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Transactional email via Resend.
// Uses validated env.RESEND_API_KEY (not raw process.env) so a missing key
// is caught at startup, not during a live send.
// ─────────────────────────────────────────────────────────────────────────────

import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

const FROM = "Mikaelson School Club <msc@mikaelsoninitiative.org>";

const CONTACT_ROUTING: Record<string, string> = {
  PARTNERSHIP: "partners@mikaelsoninitiative.org",
  MEDIA: "media@mikaelsoninitiative.org",
  SCHOOL_ENQUIRY: "msc@mikaelsoninitiative.org",
  GENERAL: "msc@mikaelsoninitiative.org",
};

const STATUS_MESSAGES: Record<string, string> = {
  REVIEWED: "Your application has been reviewed by our team.",
  SCHEDULED: "We would like to schedule a call with you. Check your inbox for a calendar invite.",
  TRAINING: "Your champion training programme has begun. Welcome aboard!",
  LAUNCHED: "Your chapter is now officially launched. Congratulations!",
  REJECTED:
    "After careful consideration, we are unable to proceed with your application at this time. We encourage you to reapply in a future cycle.",
};

// Beautiful responsive HTML email template wrapper
function buildEmailTemplate(contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mikaelson School Club</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 0;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          .header {
            background-color: #003e45;
            padding: 24px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            letter-spacing: 0.05em;
          }
          .content {
            padding: 32px 24px;
          }
          .footer {
            background-color: #f1f5f9;
            padding: 20px 24px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
          .btn {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 16px 0;
            text-align: center;
            text-decoration: none;
          }
          .btn:hover {
            background-color: #1d4ed8;
            text-decoration: none;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          table td:first-child {
            font-weight: 600;
            color: #475569;
            width: 30%;
          }
          blockquote {
            margin: 16px 0;
            padding: 12px 16px;
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            font-style: italic;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MIKAELSON SCHOOL CLUB</h1>
          </div>
          <div class="content">
            ${contentHtml}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Mikaelson School Club. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
}

// ── Application emails ────────────────────────────────────────────────────────

export async function sendApplicationConfirmation(data: {
  to: string;
  contactName: string;
  schoolName: string;
}) {
  const html = buildEmailTemplate(`
    <p>Hi ${data.contactName},</p>
    <p>Thank you for applying to launch a Mikaelson School Club chapter at <strong>${data.schoolName}</strong>.</p>
    <p>Our team will review your application and reach out within <strong>3 working days</strong> to discuss next steps.</p>
    <p>If you have questions in the meantime, reply to this email or contact us at
       <a href="mailto:msc@mikaelsoninitiative.org">msc@mikaelsoninitiative.org</a>.</p>
    <p>With excitement,<br/>The Mikaelson School Club Team</p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "We received your application — Mikaelson School Club",
    html,
  });
}

export async function sendApplicationAlert(data: {
  schoolName: string;
  contactName: string;
  role: string;
  email: string;
  phone?: string;
  location: string;
  studentsEstimate: number;
  message?: string;
  applicationId: string;
}) {
  const html = buildEmailTemplate(`
    <h2>New School Application</h2>
    <table>
      <tr><td>School</td><td>${data.schoolName}</td></tr>
      <tr><td>Contact</td><td>${data.contactName} (${data.role})</td></tr>
      <tr><td>Email</td><td>${data.email}</td></tr>
      <tr><td>Phone</td><td>${data.phone ?? "—"}</td></tr>
      <tr><td>Location</td><td>${data.location}</td></tr>
      <tr><td>Students</td><td>${data.studentsEstimate}</td></tr>
      <tr><td>Message</td><td>${data.message ?? "—"}</td></tr>
      <tr><td>Application ID</td><td>${data.applicationId}</td></tr>
    </table>
    <p style="text-align: center;">
      <a href="${env.NEXTAUTH_URL}/admin/applications/${data.applicationId}" class="btn">
        View in admin dashboard →
      </a>
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: "msc@mikaelsoninitiative.org",
    subject: `New application: ${data.schoolName}`,
    html,
  });
}

// ── Contact emails ────────────────────────────────────────────────────────────

export async function sendContactAlert(data: {
  name: string;
  email: string;
  type: string;
  message: string;
  messageId: string;
}) {
  const to = CONTACT_ROUTING[data.type] ?? "msc@mikaelsoninitiative.org";
  const html = buildEmailTemplate(`
    <h2>${data.type.replace(/_/g, " ")} Enquiry</h2>
    <p><strong>From:</strong> ${data.name} &lt;${data.email}&gt;</p>
    <p><strong>Message:</strong></p>
    <blockquote>${data.message}</blockquote>
    <p style="text-align: center;">
      <a href="${env.NEXTAUTH_URL}/admin/contacts/${data.messageId}" class="btn">
        View in admin dashboard →
      </a>
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    reply_to: data.email,
    subject: `New ${data.type.toLowerCase().replace(/_/g, " ")} enquiry from ${data.name}`,
    html,
  });
}

export async function sendContactAutoReply(data: {
  to: string;
  name: string;
  type: string;
}) {
  const html = buildEmailTemplate(`
    <p>Hi ${data.name},</p>
    <p>Thank you for reaching out. We have received your ${
      data.type === "PARTNERSHIP" ? "partnership proposal" : "message"
    } and will respond within <strong>2 business days</strong>.</p>
    <p>Warm regards,<br/>The Mikaelson School Club Team</p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "We got your message — Mikaelson School Club",
    html,
  });
}

// ── Status-change email ───────────────────────────────────────────────────────

export async function sendStatusUpdateEmail(data: {
  to: string;
  contactName: string;
  schoolName: string;
  newStatus: string;
}) {
  const body = STATUS_MESSAGES[data.newStatus];
  if (!body) return;
  const html = buildEmailTemplate(`
    <p>Hi ${data.contactName},</p>
    <p>${body}</p>
    <p>If you have questions, reply to this email or contact us at
       <a href="mailto:msc@mikaelsoninitiative.org">msc@mikaelsoninitiative.org</a>.</p>
    <p>Warm regards,<br/>The Mikaelson School Club Team</p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: `Update on your application — ${data.schoolName}`,
    html,
  });
}

// ── Password Reset email ───────────────────────────────────────────────────────

export async function sendPasswordResetEmail(data: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const html = buildEmailTemplate(`
    <p>Hi ${data.name},</p>
    <p>We received a request to reset your admin password.</p>
    <p style="text-align: center;">
      <a href="${data.resetUrl}" class="btn">
        Reset password
      </a>
    </p>
    <p>This link expires in <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.</p>
    <p>For security, do not share this link with anyone.</p>
    <p>Warm regards,<br/>The Mikaelson School Club Team</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
    <p style="font-size: 12px; color: #64748b; text-align: center;">
      If the button doesn't work, copy and paste this URL into your browser:<br/>
      <a href="${data.resetUrl}">${data.resetUrl}</a>
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "Reset your password — Mikaelson School Club",
    html,
  });
}

// ── Email Verification email ───────────────────────────────────────────────────

export async function sendEmailVerificationEmail(data: {
  to: string;
  name: string;
  verificationUrl: string;
}) {
  const html = buildEmailTemplate(`
    <p>Hi ${data.name},</p>
    <p>Thank you for signing up for an account on the Mikaelson School Club admin portal.</p>
    <p>Please click the button below to verify your email address and activate your account:</p>
    <p style="text-align: center;">
      <a href="${data.verificationUrl}" class="btn">
        Verify email address
      </a>
    </p>
    <p>This link expires in <strong>24 hours</strong>. If you did not sign up for this account, you can safely ignore this email.</p>
    <p>Warm regards,<br/>The Mikaelson School Club Team</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
    <p style="font-size: 12px; color: #64748b; text-align: center;">
      If the button doesn't work, copy and paste this URL into your browser:<br/>
      <a href="${data.verificationUrl}">${data.verificationUrl}</a>
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "Verify your email address — Mikaelson School Club",
    html,
  });
}

// ── Volunteer emails ─────────────────────────────────────────────────────────

const VOLUNTEER_STATUS_MESSAGES: Record<string, string> = {
  REVIEWED: "Your volunteer application has been reviewed by our team.",
  SCHEDULED: "We would like to schedule a call with you to discuss volunteering. Check your inbox for a calendar invite.",
  TRAINING: "Your champion volunteer training programme has begun. Welcome aboard!",
  LAUNCHED: "Your status is now set to Launched. Thank you for your support!",
  REJECTED:
    "After careful consideration, we are unable to proceed with your volunteer application at this time.",
};

export async function sendVolunteerConfirmation(data: {
  to: string;
  name: string;
}) {
  const html = buildEmailTemplate(`
    <p>Hi ${data.name},</p>
    <p>Thank you for applying to volunteer with the Mikaelson Initiative.</p>
    <p>Our team will review your application and reach out within <strong>3 working days</strong> to discuss next steps.</p>
    <p>If you have questions in the meantime, reply to this email or contact us at
       <a href="mailto:msc@mikaelsoninitiative.org">msc@mikaelsoninitiative.org</a>.</p>
    <p>With excitement,<br/>The Mikaelson School Club Team</p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "We received your volunteer application — Mikaelson School Club",
    html,
  });
}

export async function sendVolunteerAlert(data: {
  name: string;
  email: string;
  phone?: string;
  role: string;
  org?: string;
  location?: string;
  motivation?: string;
  applicationId: string;
}) {
  const html = buildEmailTemplate(`
    <h2>New Volunteer Application</h2>
    <table>
      <tr><td>Name</td><td>${data.name}</td></tr>
      <tr><td>Email</td><td>${data.email}</td></tr>
      <tr><td>Phone</td><td>${data.phone ?? "—"}</td></tr>
      <tr><td>Role</td><td>${data.role}</td></tr>
      <tr><td>Organisation</td><td>${data.org ?? "—"}</td></tr>
      <tr><td>Location</td><td>${data.location ?? "—"}</td></tr>
      <tr><td>Motivation</td><td>${data.motivation ?? "—"}</td></tr>
      <tr><td>Application ID</td><td>${data.applicationId}</td></tr>
    </table>
    <p style="text-align: center;">
      <a href="${env.NEXTAUTH_URL}/admin/volunteers/${data.applicationId}" class="btn">
        View in admin dashboard →
      </a>
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: "msc@mikaelsoninitiative.org",
    subject: `New volunteer: ${data.name}`,
    html,
  });
}

export async function sendVolunteerStatusUpdateEmail(data: {
  to: string;
  name: string;
  newStatus: string;
}) {
  const body = VOLUNTEER_STATUS_MESSAGES[data.newStatus];
  if (!body) return;
  const html = buildEmailTemplate(`
    <p>Hi ${data.name},</p>
    <p>${body}</p>
    <p>If you have questions, reply to this email or contact us at
       <a href="mailto:msc@mikaelsoninitiative.org">msc@mikaelsoninitiative.org</a>.</p>
    <p>Warm regards,<br/>The Mikaelson School Club Team</p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.to,
    subject: "Update on your volunteer application — Mikaelson School Club",
    html,
  });
}