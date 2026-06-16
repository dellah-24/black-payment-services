import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import { cancelPaymentInvoice, expirePaymentInvoice, getMerchantPaymentInvoice, getPaymentInvoice, markPaymentInvoicePaid, normalizePaymentStatus, refundPaymentInvoice } from '@/lib/paymentService';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payment = await getPaymentInvoice(params.id);
    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to fetch payment' }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? 'info');

    if (action === 'cancel') {
      const payment = await cancelPaymentInvoice(params.id, userId);
      return NextResponse.json({ payment });
    }

    if (action === 'mark_paid') {
      const payment = await markPaymentInvoicePaid(params.id, userId, typeof body.tx_hash === 'string' ? body.tx_hash : undefined);
      return NextResponse.json({ payment });
    }

    if (action === 'refund') {
      const refund = await refundPaymentInvoice(params.id, userId, typeof body.amount === 'string' ? body.amount : undefined, typeof body.reason === 'string' ? body.reason : undefined);
      return NextResponse.json({ refund });
    }

    if (action === 'status' && typeof body.status === 'string') {
      const status = normalizePaymentStatus(body.status);
      if (status === 'PAID') {
        return NextResponse.json({ payment: await markPaymentInvoicePaid(params.id, userId, typeof body.tx_hash === 'string' ? body.tx_hash : undefined) });
      }
      if (status === 'CANCEL') {
        return NextResponse.json({ payment: await cancelPaymentInvoice(params.id, userId) });
      }
      if (status === 'EXPIRED') {
        return NextResponse.json({ payment: await expirePaymentInvoice(params.id, userId) });
      }
      return NextResponse.json({ payment: await getMerchantPaymentInvoice(params.id, userId) });
    }

    const payment = await getMerchantPaymentInvoice(params.id, userId);
    return NextResponse.json({ payment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update payment' }, { status: 400 });
  }
}
