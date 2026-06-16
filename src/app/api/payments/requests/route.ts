import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import {
  createPaymentInvoice,
  listPaymentInvoices,
  normalizePaymentCurrency,
  normalizePaymentNetwork,
  normalizePaymentStatus,
  refreshExpiredPayments,
} from '@/lib/paymentService';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    await refreshExpiredPayments();

    const status = request.nextUrl.searchParams.get('status');
    const limit = request.nextUrl.searchParams.get('limit');
    const offset = request.nextUrl.searchParams.get('offset');

    const payments = await listPaymentInvoices({
      userId,
      status: status ? normalizePaymentStatus(status) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to list payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payment = await createPaymentInvoice({
      userId,
      amount: String(body.amount ?? ''),
      currency: normalizePaymentCurrency(String(body.currency ?? 'USDT')),
      network: normalizePaymentNetwork(String(body.network ?? 'trc20')),
      description: typeof body.description === 'string' ? body.description : undefined,
      order_id: typeof body.order_id === 'string' ? body.order_id : undefined,
      callback_url: typeof body.callback_url === 'string' ? body.callback_url : undefined,
      success_url: typeof body.success_url === 'string' ? body.success_url : undefined,
      cancel_url: typeof body.cancel_url === 'string' ? body.cancel_url : undefined,
      payer_hash: typeof body.payer_hash === 'string' ? body.payer_hash : undefined,
      lifetime: typeof body.lifetime === 'number' ? body.lifetime : undefined,
      to_currency: typeof body.to_currency === 'string' ? normalizePaymentCurrency(body.to_currency) : undefined,
      is_fee_paid_by_user: Boolean(body.is_fee_paid_by_user),
      is_payment_multiple: Boolean(body.is_payment_multiple),
      is_html_notification: Boolean(body.is_html_notification),
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message.includes('Authentication') ? 401 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create payment' }, { status });
  }
}

