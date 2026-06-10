const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
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

module.exports = { sendEmail, buildNotificationEmail, buildTaskAssignmentEmail };
