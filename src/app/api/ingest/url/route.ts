import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json(
    { error: "Not Implemented - Phase 2" },
    { status: 501 }
  );
}
