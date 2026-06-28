import { NextResponse } from 'next/server';
import { getCustodialReadiness } from '@/lib/custodialService';

export async function GET() {
  const readiness = getCustodialReadiness();

  return NextResponse.json({
    status: 'ok',
    custody: readiness,
    timestamp: new Date().toISOString(),
  });
}
