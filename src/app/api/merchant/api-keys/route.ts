import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import { createMerchantApiKey, listMerchantApiKeys } from '@/lib/paymentService';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const apiKeys = await listMerchantApiKeys(userId);
    return NextResponse.json({ apiKeys });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to list API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : undefined;
    const apiKey = await createMerchantApiKey({
      userId,
      name: typeof body.name === 'string' ? body.name : 'Default API key',
      permissions,
    });

    return NextResponse.json({ apiKey }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create API key' }, { status: 400 });
  }
}

