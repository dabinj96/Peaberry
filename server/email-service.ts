import sgMail from '@sendgrid/mail';
import { MailDataRequired } from '@sendgrid/helpers/classes/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized successfully');
} else {
  console.warn('SENDGRID_API_KEY not found in environment variables. Email functionality will be limited.');
}

// Track failed email attempts for rate limiting
const emailAttemptTracker = new Map<string, { count: number, lastAttempt: number }>();

// Rate limit configuration
const rateLimitConfig = {
  maxAttempts: 5,           // Max password reset requests per time window
  timeWindowMs: 3600000,    // 1 hour in milliseconds
  lockoutDurationMs: 7200000 // 2 hours lockout duration after max attempts reached
};

/**
 * Check if an email address has exceeded the rate limit
 * @param email Email address to check
 * @returns Boolean indicating if the email is rate limited
 */
export function isRateLimited(email: string): boolean {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const attempts = emailAttemptTracker.get(normalizedEmail);
  
  if (!attempts) return false;
  
  // Check if we're in lockout period after max attempts
  if (attempts.count >= rateLimitConfig.maxAttempts) {
    const lockoutEndTime = attempts.lastAttempt + rateLimitConfig.lockoutDurationMs;
    if (now < lockoutEndTime) {
      return true;
    }
    // Lockout period expired, reset attempts
    emailAttemptTracker.set(normalizedEmail, { count: 0, lastAttempt: now });
    return false;
  }
  
  // Check if we're still in the time window
  const timeWindowEndTime = attempts.lastAttempt + rateLimitConfig.timeWindowMs;
  if (now > timeWindowEndTime) {
    // Time window expired, reset attempts
    emailAttemptTracker.set(normalizedEmail, { count: 0, lastAttempt: now });
  }
  
  return false;
}

/**
 * Track an email attempt for rate limiting
 * @param email Email address to track
 */
export function trackEmailAttempt(email: string): void {
  if (!email) return;
  
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const attempts = emailAttemptTracker.get(normalizedEmail);
  
  if (!attempts) {
    emailAttemptTracker.set(normalizedEmail, { count: 1, lastAttempt: now });
    return;
  }
  
  // Check if we're still in the time window
  const timeWindowEndTime = attempts.lastAttempt + rateLimitConfig.timeWindowMs;
  if (now > timeWindowEndTime) {
    // Time window expired, reset attempts
    emailAttemptTracker.set(normalizedEmail, { count: 1, lastAttempt: now });
  } else {
    // Increment attempts within time window
    emailAttemptTracker.set(normalizedEmail, { 
      count: attempts.count + 1, 
      lastAttempt: now 
    });
  }
}

/**
 * Send a password reset email
 * @param email Recipient email address
 * @param resetLink Password reset link
 * @param username Optional username for personalization
 * @returns Promise resolving to boolean indicating success
 */
export async function sendPasswordResetEmail(email: string, resetLink: string, username?: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Cannot send password reset email: SENDGRID_API_KEY not configured');
    // For development, we'll log the reset link
    console.log(`[DEV ONLY] Password reset link for ${email}: ${resetLink}`);
    return false;
  }
  
  try {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@peaberry.com';
    const appName = 'Peaberry Coffee';
    
    const msg: MailDataRequired = {
      to: email,
      from: fromEmail,
      subject: `${appName} - Password Reset`,
      text: `Hello ${username || ''},\n\nYou recently requested to reset your password for your ${appName} account. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email or contact support if you have questions.\n\nThank you,\n${appName} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B4513;">Password Reset Request</h2>
          <p>Hello ${username || ''},</p>
          <p>You recently requested to reset your password for your ${appName} account. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #8B4513; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Your Password</a>
          </div>
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>Thank you,<br>${appName} Team</p>
          </div>
        </div>
      `
    };
    
    await sgMail.send(msg);
    console.log(`Password reset email sent successfully to ${email}`);
    return true;
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('SendGrid error details:', error.response?.body);
    }
    return false;
  }
}

/**
 * Send a password changed confirmation email
 * @param email Recipient email address
 * @param username Optional username for personalization
 * @returns Promise resolving to boolean indicating success
 */
export async function sendPasswordChangedEmail(email: string, username?: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Cannot send password changed email: SENDGRID_API_KEY not configured');
    return false;
  }
  
  try {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@peaberry.com';
    const appName = 'Peaberry Coffee';
    
    const msg: MailDataRequired = {
      to: email,
      from: fromEmail,
      subject: `${appName} - Password Changed`,
      text: `Hello ${username || ''},\n\nYour password for ${appName} has been successfully changed.\n\nIf you did not make this change, please contact support immediately.\n\nThank you,\n${appName} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B4513;">Password Changed</h2>
          <p>Hello ${username || ''},</p>
          <p>Your password for ${appName} has been successfully changed.</p>
          <p><strong>If you did not make this change, please contact support immediately.</strong></p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>Thank you,<br>${appName} Team</p>
          </div>
        </div>
      `
    };
    
    await sgMail.send(msg);
    console.log(`Password changed notification email sent successfully to ${email}`);
    return true;
  } catch (error: any) {
    console.error('Error sending password changed email:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('SendGrid error details:', error.response?.body);
    }
    return false;
  }
}