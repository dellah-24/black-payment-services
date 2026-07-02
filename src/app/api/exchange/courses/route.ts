import { NextResponse } from 'next/server';
import { getEnv, isPlaceholder } from '@/lib/env';

export async function GET() {
  const apiKey = getEnv('EXCHANGE_API_KEY');
  const apiUrl = getEnv('EXCHANGE_API_URL');

  if (isPlaceholder(apiKey) || isPlaceholder(apiUrl)) {
    return NextResponse.json({
      courses: {},
      source: 'unavailable',
      error: 'Exchange API not configured',
    });
  }

  try {
    const response = await fetch(`${apiUrl}/courses`, {
      headers: {
        'X-API-Key': apiKey ?? '',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Exchange API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      courses: data.courses || {},
      source: 'api',
    });
  } catch (error) {
    console.error('Exchange courses fetch error:', error);
    return NextResponse.json({
      courses: {},
      source: 'error',
      error: 'Failed to fetch exchange courses',
    });
  }
}
