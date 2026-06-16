import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/custodialService';
import { deleteWebhook } from '@/lib/paymentService';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthenticatedUserId(_request);
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    await deleteWebhook(params.id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete webhook' }, { status: 400 });
  }
}
