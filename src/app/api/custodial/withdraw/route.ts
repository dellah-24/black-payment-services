import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId, submitCustodialWithdrawal } from '@/lib/custodialService';

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { chain, to, amount, idempotencyKey, memo } = body;

    if (!chain || !to || !amount || !idempotencyKey) {
      return NextResponse.json({ error: 'Missing required fields: chain, to, amount, idempotencyKey' }, { status: 400 });
    }

    const withdrawal = await submitCustodialWithdrawal({
      userId,
      chain,
      to,
      amount,
      idempotencyKey,
      memo,
    });

    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (error) {
    console.error('Custodial withdrawal error:', error);
    return NextResponse.json({ error: 'Withdrawal failed' }, { status: 500 });
  }
}
