import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const paymentId = params.id;

  return NextResponse.json({
    id: paymentId,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  });
}
