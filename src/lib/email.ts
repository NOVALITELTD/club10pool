import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: `"Club10 Pool" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Verify your Club10 Pool email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#e2e8f0;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#c9a84c,#a07830);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#0a0c0f">C</div>
          <h1 style="font-size:20px;font-weight:800;margin:12px 0 4px">Club10 Pool</h1>
          <p style="color:#94a3b8;font-size:13px;margin:0">Investment Pool Manager</p>
        </div>
        <h2 style="font-size:16px;font-weight:600;margin-bottom:8px">Hi ${name},</h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">Thanks for registering. Please verify your email address to continue.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${url}" style="background:#00d4aa;color:#000;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block">
            Verify Email
          </a>
        </div>
        <p style="color:#64748b;font-size:12px;text-align:center">This link expires in 24 hours. If you didn't register, ignore this email.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: `"Club10 Pool" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset your Club10 Pool password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#e2e8f0;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#c9a84c,#a07830);display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#0a0c0f">C</div>
          <h1 style="font-size:20px;font-weight:800;margin:12px 0 4px">Club10 Pool</h1>
        </div>
        <h2 style="font-size:16px;font-weight:600;margin-bottom:8px">Hi ${name},</h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">We received a request to reset your password.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${url}" style="background:#c9a84c;color:#000;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block">
            Reset Password
          </a>
        </div>
        <p style="color:#64748b;font-size:12px;text-align:center">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  })
}
