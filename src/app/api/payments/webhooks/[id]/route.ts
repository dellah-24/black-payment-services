import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder } from '@/lib/env';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('payment_webhooks')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json({ webhook: data });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { error } = await supabase
    .from('payment_webhooks')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('id', params.id);

  if (error) {
    logger.error('Failed to mark webhook as processed', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
