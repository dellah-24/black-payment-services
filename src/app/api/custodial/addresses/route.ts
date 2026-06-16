import { NextRequest, NextResponse } from 'next/server';
import { ensureCustodialAddress, getAuthenticatedUserId, getCustodialAddresses } from '@/lib/custodialService';
import { CUSTODIAL_MVP_CHAINS, normalizeCustodialChain } from '@/lib/custodyPolicy';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const chainParam = request.nextUrl.searchParams.get('chain');
    const chain = chainParam ? normalizeCustodialChain(chainParam) : undefined;
    const addresses = await getCustodialAddresses({ userId, chain });

    return NextResponse.json({ addresses });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to fetch custody addresses' },
      { status: error instanceof Error && error.message.includes('Authentication') ? 401 : 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      chain?: string;
      accountIndex?: number;
      purpose?: 'deposit' | 'withdrawal' | 'hot' | 'cold';
    };

    if (!body.chain || !CUSTODIAL_MVP_CHAINS.includes(normalizeCustodialChain(body.chain))) {
      return NextResponse.json({ error: 'chain is required and must be tron, ethereum, or bsc' }, { status: 400 });
    }

    const address = await ensureCustodialAddress({
      userId,
      chain: normalizeCustodialChain(body.chain),
      accountIndex: Number.isInteger(body.accountIndex) ? body.accountIndex : 0,
      purpose: body.purpose ?? 'deposit',
    });

    return NextResponse.json({ address });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create custody address' },
      { status: 503 }
    );
  }
}
