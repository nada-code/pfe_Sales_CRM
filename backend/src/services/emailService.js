const nodemailer = require("nodemailer");

// ============================================================
//  TRANSPORTER
// ============================================================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================================
//  SHARED LAYOUT HELPER
//  Wraps any content block in a consistent branded shell.
// ============================================================
const buildEmail = ({ title, preheader, body }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    * { box-sizing: border-box; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; color:#f4f6fb; font-size:1px;">
    ${preheader}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;
  </div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f6fb; padding: 40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px; background:#ffffff; border-radius:16px;
                      box-shadow:0 4px 6px rgba(0,0,0,0.05), 0 20px 50px rgba(0,0,0,0.08);
                      border:1px solid #e8eaf0; overflow:hidden;">

          

          <!-- Body -->
          <tr>
            <td style="padding:44px 44px 36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 44px 32px; border-top:1px solid #eef0f5; text-align:center;">
              <p style="margin:0 0 6px; font-size:12px; color:#9ca3af; line-height:1.6;">
                You're receiving this email because you have an account with CRM Suite.
              </p>
              <p style="margin:0; font-size:12px; color:#c4c9d4;">
                © ${new Date().getFullYear()} CRM Suite — All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
`;

// ============================================================
//  SEND HELPER  (DRY wrapper around transporter.sendMail)
// ============================================================
const sendMail = async ({ to, subject, html, logLabel }) => {
  try {
    await transporter.sendMail({
      from: `"CRM Suite" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] ${logLabel} → ${to}`);
    return true;
  } catch (error) {
    console.error(`[email] Failed to send ${logLabel} to ${to}:`, error);
    throw new Error(`Failed to send ${logLabel}`);
  }
};

// ============================================================
//  PASSWORD RESET EMAIL
// ============================================================
exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = buildEmail({
    title: "Password Reset Request",
    preheader: "Reset your CRM Suite password — this link expires in 1 hour.",
    body: `
     <!-- Lock icon circle -->
              <div style="width:72px; height:72px; margin:0 auto 24px;
                           border-radius:20px;
                           background:linear-gradient(135deg, rgba(78,110,242,0.15) 0%, rgba(139,92,246,0.12) 100%);
                           border:1px solid rgba(78,110,242,0.25);
                           box-shadow:0 8px 32px rgba(78,110,242,0.15);
                           font-size:32px; line-height:72px; text-align:center;">
                🔐
              </div>

      <!-- Title -->
              <h1 style="margin:0 0 12px;
                          font-family:'DM Serif Display', Georgia, serif;
                          font-size:30px; font-weight:400; font-style:normal;
                          color:#1a1a2e;
                          letter-spacing:-0.02em; line-height:1.2;
                          text-align:center;">
                Reset your password
              </h1>

      <!-- Subtitle -->
      <p style="margin:0 0 28px; font-size:15px; color:#6b7280; text-align:center;
                 line-height:1.65;">
        We received a request to reset the password for your account.<br/>
        Click the button below to choose a new one.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center; margin-bottom:32px;">
        <a href="${resetUrl}"
           style="display:inline-block; padding:14px 36px;
                  background:linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
                  color:#ffffff; text-decoration:none; border-radius:10px;
                  font-size:14px; font-weight:700; letter-spacing:0.06em;
                  text-transform:uppercase; box-shadow:0 6px 20px rgba(0,102,204,0.28);">
          Reset Password
        </a>
      </div>



      <!-- Notices -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:14px 16px; background:#fffbeb; border-radius:8px;
                      border-left:3px solid #c4a464; margin-bottom:12px;">
            <p style="margin:0; font-size:13px; color:#92750a; line-height:1.5;">
              ⏱ This link will expire in <strong>1 hour</strong>.
            </p>
          </td>
        </tr>
        <tr><td style="height:10px;"></td></tr>
        <tr>
          <td style="padding:14px 16px; background:#f4f6fb; border-radius:8px;
                      border-left:3px solid #d1d5db;">
            <p style="margin:0; font-size:13px; color:#6b7280; line-height:1.5;">
              If you didn't request this, you can safely ignore this email — your password won't change.
            </p>
          </td>
        </tr>
      </table>
    `,
  });

  return sendMail({
    to: email,
    subject: "Reset your  password",
    html,
    logLabel: "password-reset",
  });
};

// ============================================================
//  ACCOUNT APPROVED EMAIL
// ============================================================
exports.sendApprovalEmail = async (email, firstName) => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const html = buildEmail({
    title: 'Your account has been approved',
    preheader: `Welcome aboard, ${firstName}! Your CRM Suite account is now active.`,
    body: `
      <!-- Check icon circle -->
      <div style="width:72px; height:72px; margin:0 auto 24px;
                  border-radius:20px;
                  background:linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.12) 100%);
                  border:1px solid rgba(16,185,129,0.25);
                  box-shadow:0 8px 32px rgba(16,185,129,0.15);
                  font-size:32px; line-height:72px; text-align:center;">
        ✅
      </div>

      <!-- Title -->
      <h1 style="margin:0 0 12px;
                 font-family:'DM Serif Display', Georgia, serif;
                 font-size:30px; font-weight:400;
                 color:#1a1a2e;
                 letter-spacing:-0.02em; line-height:1.2;
                 text-align:center;">
        You're approved, ${firstName}!
      </h1>

      <!-- Subtitle -->
      <p style="margin:0 0 28px; font-size:15px; color:#6b7280; text-align:center; line-height:1.65;">
        Your sales account has been validated by your manager.<br/>
        You can now log in and start working your leads.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center; margin-bottom:32px;">
        <a href="${loginUrl}"
           style="display:inline-block; padding:14px 36px;
                  background:linear-gradient(135deg, #10b981 0%, #059669 100%);
                  color:#ffffff; text-decoration:none; border-radius:10px;
                  font-size:14px; font-weight:700; letter-spacing:0.06em;
                  text-transform:uppercase; box-shadow:0 6px 20px rgba(16,185,129,0.30);">
          Go to Dashboard
        </a>
      </div>

      <!-- Info box -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:16px 18px; background:#f0fdf4; border-radius:8px; border-left:3px solid #10b981;">
            <p style="margin:0; font-size:13px; color:#065f46; line-height:1.6;">
              🎯 <strong>What's next?</strong><br/>
              Head to your dashboard to see the leads assigned to you, update statuses, and add notes after each call.
            </p>
          </td>
        </tr>
      </table>
    `,
  });

  return sendMail({
    to: email,
    subject: `✅ Account approved — Welcome to the team, ${firstName}!`,
    html,
    logLabel: 'account-approval',
  });
};