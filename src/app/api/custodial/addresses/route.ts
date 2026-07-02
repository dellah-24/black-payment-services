import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId, getCustodialAddresses } from '@/lib/custodialService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addresses = await getCustodialAddresses({ userId });

  return NextResponse.json({ addresses });
}
