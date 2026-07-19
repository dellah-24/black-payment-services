import { NextResponse } from 'next/server';
import '@/lib/server/bootstrap';
import { hasSecret } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Number(process.env.__APP_STARTED_AT || Date.now());
  const uptimeMs = Date.now() - startedAt;

  const minimalSecrets = {
    JWT_SECRET: hasSecret('JWT_SECRET'),
    RESEND_API_KEY: hasSecret('RESEND_API_KEY'),
  };

  return NextResponse.json({
    status: 'ok',
    uptimeMs,
    env: process.env.NODE_ENV,
    secrets: minimalSecrets,
    timestamp: new Date().toISOString(),
  });
}
