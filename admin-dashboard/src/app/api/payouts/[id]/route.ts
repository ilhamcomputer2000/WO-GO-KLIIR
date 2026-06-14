export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { updatePayoutStatus } from "@/lib/store";
import type { PayoutStatus } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status: PayoutStatus };

  const result = await updatePayoutStatus(id, status);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ payout: result.payout });
}
