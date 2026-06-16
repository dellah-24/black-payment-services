import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId, submitCustodialWithdrawal } from '@/lib/custodialService';
import { custodialWithdrawalSchema } from '@/lib/custodyPolicy';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = custodialWithdrawalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid withdrawal request', details: parsed.error.flatten() }, { status: 400 });
    }

    const withdrawal = await submitCustodialWithdrawal({
      userId,
      ...parsed.data,
    });

    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit withdrawal';
    const status = message.includes('Another withdrawal') || message.includes('Invalid') ? 409 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
