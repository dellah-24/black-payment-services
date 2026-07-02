import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import { createCustodialKeyManagerForRequest } from '@/lib/custodialService';
import { getEnv, isPlaceholder } from '@/lib/env';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount, currency, chain, description, redirectUrl } = body;

    if (!amount || !currency) {
      return NextResponse.json({ error: 'Missing required fields: amount, currency' }, { status: 400 });
    }

    const keyManager = createCustodialKeyManagerForRequest();
    const depositAddresses = await keyManager.deriveDepositAddresses(userId);

    const paymentRequest = {
      id: crypto.randomUUID(),
      userId,
      amount,
      currency,
      chain: chain || 'ethereum',
      description: description || '',
      redirectUrl: redirectUrl || '',
      depositAddress: depositAddresses[0]?.address || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    logger.info('Payment request created', { paymentRequestId: paymentRequest.id, userId });

    return NextResponse.json({ paymentRequest }, { status: 201 });
  } catch (error) {
    logger.error('Payment request creation failed', error as Error);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  return NextResponse.json({
    paymentRequests: [],
    total: 0,
    limit,
  });
}
