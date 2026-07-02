import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder } from '@/lib/env';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { error } = await supabase
    .from('merchant_api_keys')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to delete merchant API key', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }

  logger.info('Merchant API key deleted', { userId, keyId: params.id });

  return NextResponse.json({ success: true });
}
