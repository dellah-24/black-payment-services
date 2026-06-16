import { NextRequest, NextResponse } from 'next/server';
import { getPaymentInvoice } from '@/lib/paymentService';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payment = await getPaymentInvoice(params.id);
    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to fetch payment status' }, { status: 404 });
  }
}
