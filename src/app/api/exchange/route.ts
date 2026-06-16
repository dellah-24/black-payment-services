import { NextRequest, NextResponse } from 'next/server';
import { createExchangeQuote } from '@/lib/paymentService';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const quote = createExchangeQuote({
      from: String(body.from ?? ''),
      to: String(body.to ?? ''),
      amount: String(body.amount ?? ''),
    });
    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create exchange quote' }, { status: 400 });
  }
}
