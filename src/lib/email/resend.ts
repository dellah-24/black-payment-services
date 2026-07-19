/**
 * Resend Email Service
 * Handles sending emails via Resend API
 */
import '@/lib/server/bootstrap';
import { getSecret, getDefaultFromEmail, getReplyToEmail } from '@/lib/secrets';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get Resend configuration from environment
 */
function getResendConfig() {
  const apiKey = getSecret('RESEND_API_KEY');
  const replyTo = getReplyToEmail() || 'noreply@tempesttouch.com';
  const defaultFrom = getDefaultFromEmail() || 'Tempest Touch <noreply@tempesttouch.com>';
  return { apiKey, replyTo, defaultFrom };
}

/**
 * Send email via Resend API
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    // Get configuration
    const { apiKey, replyTo, defaultFrom } = getResendConfig();

    // Validate configuration
    if (!apiKey) {
      return {
        success: false,
        error: 'Resend API key is not configured',
      };
    }

    // Validate input
    if (!isValidEmail(input.to)) {
      return {
        success: false,
        error: 'Invalid email address',
      };
    }

    if (!input.subject || input.subject.trim() === '') {
      return {
        success: false,
        error: 'Subject is required',
      };
    }

    if (!input.html || input.html.trim() === '') {
      return {
        success: false,
        error: 'HTML content is required',
      };
    }

    // Send via Resend API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from || defaultFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        reply_to: input.replyTo || replyTo,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg = (errorData && (errorData.message || errorData.error)) || `Resend API error: ${response.status}`;
      return {
        success: false,
        error: msg,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send bulk emails (for future use)
 */
export async function sendBulkEmails(
  emails: SendEmailInput[]
): Promise<SendEmailResult[]> {
  const results = await Promise.allSettled(emails.map((email) => sendEmail(email)));

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const reason = (result as PromiseRejectedResult).reason;
    let msg: string;
    if (reason instanceof Error) {
      msg = reason.message;
    } else if (typeof reason === 'string') {
      msg = reason;
    } else {
      try {
        msg = JSON.stringify(reason);
      } catch {
        msg = 'Failed to send email';
      }
    }
    return {
      success: false,
      error: msg || 'Failed to send email',
    };
  });
}
