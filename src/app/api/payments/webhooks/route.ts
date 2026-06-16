import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import { createWebhook, listWebhooks, normalizeWebhookEvent } from '@/lib/paymentService';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const webhooks = await listWebhooks(userId);
    return NextResponse.json({ webhooks });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to list webhooks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const events = Array.isArray(body.events) ? body.events.map((event) => normalizeWebhookEvent(String(event))) : undefined;
    const webhook = await createWebhook({
      userId,
      url: String(body.url ?? ''),
      events,
      secret: typeof body.secret === 'string' ? body.secret : undefined,
    });

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create webhook' }, { status: 400 });
  }
}

