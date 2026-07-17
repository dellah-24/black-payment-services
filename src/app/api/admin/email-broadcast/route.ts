import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from('merchants')
    .select('email', { count: 'exact', head: true })
    .not('email', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  let body: { subject?: string; html?: string; text?: string };
  try {
    body = (await req.json()) as { subject?: string; html?: string; text?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { subject, html, text } = body;
  if (!subject || !html) {
    return NextResponse.json({ error: 'subject and html are required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: merchants, error } = await supabase
    .from('merchants')
    .select('email')
    .not('email', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const emails = (merchants ?? [])
    .map((m) => m.email as string)
    .filter(Boolean);

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
  }

  const from = process.env.EMAIL_FROM ?? 'noreply@tempesttouch.com';

  // Send emails via Resend API directly
  const results = await Promise.allSettled(
    emails.map(async (to: string) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html, text }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error for ${to}: ${err}`);
      }
      return { to, success: true };
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ sent, failed });
}
