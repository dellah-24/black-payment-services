import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId, getCustodialBalances } from '@/lib/custodialService';
import { normalizeCustodialChain } from '@/lib/custodyPolicy';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const chainParam = request.nextUrl.searchParams.get('chain');
    const chain = chainParam ? normalizeCustodialChain(chainParam) : undefined;
    const balances = await getCustodialBalances({ userId, chain });

    return NextResponse.json({ balances });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to fetch custodial balances' },
      { status: 503 }
    );
  }
}
