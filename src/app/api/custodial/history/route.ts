import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId, getCustodialDeposits, getCustodialWithdrawals } from '@/lib/custodialService';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '50');
    const [withdrawals, deposits] = await Promise.all([
      getCustodialWithdrawals({ userId, limit }),
      getCustodialDeposits({ userId, limit }),
    ]);

    return NextResponse.json({ withdrawals, deposits });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to fetch custodial history' },
      { status: 503 }
    );
  }
}
