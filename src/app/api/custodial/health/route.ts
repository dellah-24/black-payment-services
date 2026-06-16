import { NextResponse } from 'next/server';
import { getCustodialReadiness } from '@/lib/custodialService';
import { checkNodeHealth } from '@/lib/blockchainNodes';
import { getCustodyReadiness } from '@/lib/custodyPolicy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = getCustodialReadiness();
  const custody = getCustodyReadiness();
  const [tron, ethereum, bsc] = await Promise.all([
    checkNodeHealth('tron'),
    checkNodeHealth('ethereum'),
    checkNodeHealth('bsc'),
  ]);

  const ok = readiness.ok && custody.ok && tron.ok && ethereum.ok && bsc.ok;

  return NextResponse.json(
    {
      ok,
      readiness,
      custody,
      nodes: { tron, ethereum, bsc },
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
