import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder } from '@/lib/env';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json({ error: 'Missing required fields: event, data' }, { status: 400 });
    }

    const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

    const { error } = await supabase
      .from('payment_webhooks')
      .insert({
        event,
        data,
        processed: false,
        received_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('Failed to store webhook', error);
      return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
    }

    logger.info('Webhook received', { event });

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing failed', error as Error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
