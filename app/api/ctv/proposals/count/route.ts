import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ensureCtvProposalTables } from '@/lib/ctv-proposals-db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ count: 0 });
    }
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ count: 0 });
    }

    await ensureCtvProposalTables();

    const r = await sql`
      SELECT COUNT(*)::int as c FROM ctv_proposals
      WHERE user_id = ${decoded.userId} AND status = 'pending'
    `;
    return NextResponse.json({ count: r[0]?.c ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
