const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    maxMessages: Infinity,
    rateDelta: 1000,
    rateLimit: 3,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) return { skipped: true };

  try {
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'Project Assigner <noreply@projectassigner.com>',
      to,
      subject,
      html,
      text,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { error: error.message };
  }
}

function buildNotificationEmail({ title, message, actionUrl, recipientName }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.10); }
        .header { background: #007AFF; padding: 32px 40px; text-align: center; }
        .header h1 { color: white; font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.3px; }
        .body { padding: 40px; }
        .greeting { font-size: 16px; color: #1d1d1f; margin-bottom: 16px; }
        .message { font-size: 15px; color: #48484a; line-height: 1.6; margin-bottom: 32px; }
        .cta { text-align: center; }
        .btn { display: inline-block; background: #007AFF; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; }
        .footer { padding: 24px 40px; background: #f5f5f7; text-align: center; font-size: 12px; color: #8e8e93; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Project Assigner</h1>
        </div>
        <div class="body">
          <p class="greeting">Hi ${recipientName || 'there'},</p>
          <h2 style="font-size: 20px; color: #1d1d1f; margin-bottom: 12px; font-weight: 600;">${title}</h2>
          <p class="message">${message}</p>
          ${actionUrl ? `<div class="cta"><a href="${actionUrl}" class="btn">View Details</a></div>` : ''}
        </div>
        <div class="footer">
          <p>Project Assigner &mdash; You received this notification because of your project activity.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { html, text: `${title}\n\n${message}${actionUrl ? `\n\nView: ${actionUrl}` : ''}` };
}

const PRIORITY_COLOR = { urgent: '#FF3B30', high: '#FF9F0A', medium: '#007AFF', low: '#34C759' };
const PRIORITY_LABEL = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };

function buildTaskAssignmentEmail({ recipientName, taskTitle, taskDescription, projectName, priority, dueDate, assignedByName }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const priorityColor = PRIORITY_COLOR[priority] || '#007AFF';
  const priorityLabel = PRIORITY_LABEL[priority] || priority;
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f7; margin: 0; padding: 0; color: #1d1d1f; }
        .container { max-width: 580px; margin: 32px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { background: #007AFF; padding: 28px 36px; }
        .header-logo { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
        .header-title { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.3px; }
        .body { padding: 36px; }
        .greeting { font-size: 15px; color: #48484a; margin: 0 0 24px; }
        .task-card { background: #f5f5f7; border-radius: 14px; padding: 20px 24px; margin-bottom: 24px; }
        .task-title { font-size: 18px; font-weight: 700; color: #1d1d1f; margin: 0 0 8px; letter-spacing: -0.2px; }
        .task-desc { font-size: 14px; color: #48484a; line-height: 1.6; margin: 0 0 16px; }
        .meta { display: flex; flex-wrap: wrap; gap: 10px; }
        .badge { display: inline-block; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
        .row { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 13px; color: #48484a; }
        .label { font-weight: 600; color: #1d1d1f; }
        .cta { text-align: center; margin: 28px 0 8px; }
        .btn { display: inline-block; background: #007AFF; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; }
        .footer { padding: 20px 36px; background: #f5f5f7; text-align: center; font-size: 12px; color: #8e8e93; border-top: 1px solid #e5e5ea; }
        .divider { border: none; border-top: 1px solid #e5e5ea; margin: 24px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-logo">Aitechtures</div>
          <div class="header-title">New Task Assigned</div>
        </div>
        <div class="body">
          <p class="greeting">Hi ${recipientName},</p>
          <p style="font-size:15px;color:#48484a;margin:0 0 20px;">You have been assigned a new task in <strong>${projectName}</strong>${assignedByName ? ` by <strong>${assignedByName}</strong>` : ''}.</p>
          <div class="task-card">
            <div class="task-title">${taskTitle}</div>
            ${taskDescription ? `<div class="task-desc">${taskDescription}</div>` : ''}
            <hr class="divider">
            <div class="row"><span class="label">Priority:</span> <span class="badge" style="background:${priorityColor}20;color:${priorityColor}">${priorityLabel}</span></div>
            ${dueDateStr ? `<div class="row"><span class="label">Due Date:</span> <span>${dueDateStr}</span></div>` : ''}
            <div class="row"><span class="label">Project:</span> <span>${projectName}</span></div>
          </div>
          <div class="cta">
            <a href="${frontendUrl}" class="btn">Open Project Assigner</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin:0">Project Assigner &mdash; Aitechtures &bull; You received this because a task was assigned to you.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${recipientName},\n\nYou have been assigned a new task in ${projectName}${assignedByName ? ` by ${assignedByName}` : ''}.\n\nTask: ${taskTitle}\nPriority: ${priorityLabel}${dueDateStr ? `\nDue: ${dueDateStr}` : ''}${taskDescription ? `\n\n${taskDescription}` : ''}\n\nOpen: ${frontendUrl}`;

  return { html, text };
}

function buildTeamLeaderEmail({ recipientName, projectName, projectUrl, memberNames = [], assignedByName }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const absoluteUrl = projectUrl
    ? (projectUrl.startsWith('http') ? projectUrl : `${frontendUrl}${projectUrl}`)
    : frontendUrl;

  const membersHtml = memberNames.length > 0
    ? memberNames.map((name) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e5ea;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;background:#007AFF;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;flex-shrink:0;">${name.charAt(0).toUpperCase()}</div>
              <span style="font-size:14px;color:#1d1d1f;font-weight:500;">${name}</span>
            </div>
          </td>
        </tr>`).join('')
    : `<tr><td style="padding:8px 0;font-size:14px;color:#8e8e93;">No other members added yet.</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f7; margin: 0; padding: 0; color: #1d1d1f; }
        .container { max-width: 580px; margin: 32px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { background: linear-gradient(135deg, #FF9F0A 0%, #FF6B00 100%); padding: 28px 36px; }
        .header-logo { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.8); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
        .header-title { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.3px; }
        .body { padding: 36px; }
        .crown-badge { display: inline-flex; align-items: center; gap: 6px; background: #FFF3E0; color: #E65100; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; border: 1px solid #FFE0B2; margin-bottom: 20px; }
        .project-card { background: #f5f5f7; border-radius: 14px; padding: 18px 22px; margin: 20px 0; border-left: 4px solid #FF9F0A; }
        .project-name { font-size: 18px; font-weight: 700; color: #1d1d1f; margin: 0 0 4px; }
        .project-meta { font-size: 13px; color: #8e8e93; }
        .section-title { font-size: 13px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 12px; }
        .members-table { width: 100%; border-collapse: collapse; }
        .cta { text-align: center; margin: 28px 0 8px; }
        .btn { display: inline-block; background: #FF9F0A; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; }
        .footer { padding: 20px 36px; background: #f5f5f7; text-align: center; font-size: 12px; color: #8e8e93; border-top: 1px solid #e5e5ea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-logo">Project Assigner</div>
          <div class="header-title">You're the Team Leader! 👑</div>
        </div>
        <div class="body">
          <p style="font-size:15px;color:#48484a;margin:0 0 16px;">Hi <strong>${recipientName}</strong>,</p>
          <div class="crown-badge">👑 Team Leader</div>
          <p style="font-size:15px;color:#48484a;line-height:1.6;margin:0 0 4px;">
            ${assignedByName ? `<strong>${assignedByName}</strong> has assigned you as` : 'You have been assigned as'} 
            <strong>Team Leader</strong> for the following project. You have full administrative rights for this project — you can add/remove members and manage all tasks.
          </p>
          <div class="project-card">
            <div class="project-name">${projectName}</div>
            <div class="project-meta">You have admin rights for this project</div>
          </div>
          <div class="section-title">Team Members (${memberNames.length})</div>
          <table class="members-table">
            ${membersHtml}
          </table>
          <div class="cta">
            <a href="${absoluteUrl}" class="btn">Open Project</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin:0">Project Assigner &mdash; You received this because you were assigned as team leader.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const memberListText = memberNames.length > 0 ? memberNames.map((n) => `  • ${n}`).join('\n') : '  (no other members yet)';
  const text = `Hi ${recipientName},\n\nYou have been assigned as Team Leader for "${projectName}"${assignedByName ? ` by ${assignedByName}` : ''}.\n\nAs team leader you can add/remove members and manage all tasks.\n\nTeam Members:\n${memberListText}\n\nView Project: ${absoluteUrl}`;

  return { html, text };
}

function buildAddedToProjectEmail({ recipientName, projectName, projectUrl, teamLeaderName, memberNames = [] }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const absoluteUrl = projectUrl
    ? (projectUrl.startsWith('http') ? projectUrl : `${frontendUrl}${projectUrl}`)
    : frontendUrl;

  const otherMembers = memberNames.filter((n) => n !== recipientName);
  const membersHtml = otherMembers.length > 0
    ? otherMembers.map((name) => `
        <tr>
          <td style="padding:6px 0;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:28px;height:28px;background:#007AFF;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;flex-shrink:0;">${name.charAt(0).toUpperCase()}</div>
              <span style="font-size:14px;color:#1d1d1f;font-weight:500;">${name}</span>
            </div>
          </td>
        </tr>`).join('')
    : `<tr><td style="padding:8px 0;font-size:14px;color:#8e8e93;">No other members yet.</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f7; margin: 0; padding: 0; color: #1d1d1f; }
        .container { max-width: 580px; margin: 32px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { background: #007AFF; padding: 28px 36px; text-align: center; }
        .header h1 { color: white; font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.3px; }
        .body { padding: 36px; }
        .greeting { font-size: 15px; color: #48484a; margin: 0 0 20px; }
        .project-card { background: #f5f5f7; border-radius: 14px; padding: 18px 22px; margin: 20px 0; border-left: 4px solid #007AFF; }
        .project-name { font-size: 18px; font-weight: 700; color: #1d1d1f; margin: 0 0 4px; }
        .team-leader { display: inline-flex; align-items: center; gap: 6px; background: #FFF3E0; color: #E65100; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; border: 1px solid #FFE0B2; margin: 8px 0; }
        .section-title { font-size: 13px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 12px; }
        .members-table { width: 100%; border-collapse: collapse; }
        .cta { text-align: center; margin: 28px 0 8px; }
        .btn { display: inline-block; background: #007AFF; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; }
        .footer { padding: 20px 36px; background: #f5f5f7; text-align: center; font-size: 12px; color: #8e8e93; border-top: 1px solid #e5e5ea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Project Assigner</h1>
        </div>
        <div class="body">
          <p class="greeting">Hi <strong>${recipientName}</strong>,</p>
          <p style="font-size:15px;color:#48484a;line-height:1.6;margin:0 0 16px;">
            You have been added to the project <strong>"${projectName}"</strong>.
          </p>
          <div class="project-card">
            <div class="project-name">${projectName}</div>
            ${teamLeaderName ? `<div class="team-leader">👑 ${teamLeaderName} is your Team Leader</div>` : '<p style="font-size:13px;color:#8e8e93;margin:4px 0 0;">No team leader assigned yet.</p>'}
          </div>
          <div class="section-title">Team Members (${otherMembers.length})</div>
          <table class="members-table">
            ${membersHtml}
          </table>
          <div class="cta">
            <a href="${absoluteUrl}" class="btn">View Project</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin:0">Project Assigner &mdash; You received this because you were added to a project.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const memberListText = otherMembers.length > 0 ? otherMembers.map((n) => `  • ${n}`).join('\n') : '  (no other members yet)';
  const text = `Hi ${recipientName},\n\nYou have been added to the project "${projectName}".\n\n${teamLeaderName ? `👑 Team Leader: ${teamLeaderName}\n` : ''}\nTeam Members:\n${memberListText}\n\nView Project: ${absoluteUrl}`;

  return { html, text };
}

function buildPasswordResetEmail({ recipientName, resetUrl }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f7; margin: 0; padding: 0; color: #1d1d1f; }
        .container { max-width: 580px; margin: 32px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { background: #007AFF; padding: 28px 36px; text-align: center; }
        .header h1 { color: white; font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.3px; }
        .body { padding: 36px; }
        .greeting { font-size: 15px; color: #48484a; margin: 0 0 20px; }
        .message { font-size: 15px; color: #48484a; line-height: 1.6; margin: 0 0 24px; }
        .warning { background: #FFF3E0; border-left: 4px solid #FF9F0A; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #E65100; }
        .cta { text-align: center; margin: 28px 0 8px; }
        .btn { display: inline-block; background: #007AFF; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; }
        .footer { padding: 20px 36px; background: #f5f5f7; text-align: center; font-size: 12px; color: #8e8e93; border-top: 1px solid #e5e5ea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Project Assigner</h1>
        </div>
        <div class="body">
          <p class="greeting">Hi <strong>${recipientName}</strong>,</p>
          <p class="message">
            We received a request to reset your password. Click the button below to create a new password for your account.
          </p>
          <div class="cta">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
          </div>
          <p style="font-size:13px;color:#8e8e93;margin-top:20px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color:#007AFF;word-break:break-all;">${resetUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p style="margin:0">Project Assigner &mdash; Aitechtures &bull; You received this because a password reset was requested.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${recipientName},\n\nWe received a request to reset your password. Use this link to create a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.`;

  return { html, text };
}

module.exports = { sendEmail, buildNotificationEmail, buildTaskAssignmentEmail, buildTeamLeaderEmail, buildAddedToProjectEmail, buildPasswordResetEmail };
