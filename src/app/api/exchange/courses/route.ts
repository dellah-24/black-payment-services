import { NextResponse } from 'next/server';
import { getExchangeCourses } from '@/lib/paymentService';

export async function GET() {
  return NextResponse.json({ courses: getExchangeCourses() });
}
