import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Use /api/wallet/create or /api/wallet/balance' },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/wallet/create or /api/wallet/balance' },
    { status: 404 }
  );
}
