import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder } from '@/lib/env';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

  const { data, error } = await supabase
    .from('merchant_api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch merchant API keys', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }

  return NextResponse.json({ apiKeys: data || [] });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const apiKey = `bp_${crypto.randomUUID().replace(/-/g, '')}`;
    const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '', getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '');

    const { data, error } = await supabase
      .from('merchant_api_keys')
      .insert({
        user_id: userId,
        name,
        key: apiKey,
        permissions: permissions || ['payments:read', 'payments:write'],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create merchant API key', error);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    logger.info('Merchant API key created', { userId, keyId: data.id });

    return NextResponse.json({ apiKey: data }, { status: 201 });
  } catch (error) {
    logger.error('Merchant API key creation failed', error as Error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
