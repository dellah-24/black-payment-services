import { NextResponse } from 'next/server';
import { getCustodialReadiness } from '@/lib/custodialService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = getCustodialReadiness();

  return NextResponse.json({
    status: 'ok',
    custody: readiness,
    timestamp: new Date().toISOString(),
  });
}
