import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const paymentId = params.id;

  return NextResponse.json({
    id: paymentId,
    status: 'pending',
    amount: '0',
    currency: 'USDT',
    chain: 'ethereum',
    createdAt: new Date().toISOString(),
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const paymentId = params.id;

  return NextResponse.json({
    id: paymentId,
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
  });
}
