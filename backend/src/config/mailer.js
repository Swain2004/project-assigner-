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
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
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

module.exports = { sendEmail, buildNotificationEmail };
