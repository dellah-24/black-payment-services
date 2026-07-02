import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId, getCustodialWithdrawals, getCustodialDeposits } from '@/lib/custodialService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const withdrawals = await getCustodialWithdrawals({ userId, limit: 50 });
  const deposits = await getCustodialDeposits({ userId, limit: 50 });

  return NextResponse.json({ withdrawals, deposits });
}
