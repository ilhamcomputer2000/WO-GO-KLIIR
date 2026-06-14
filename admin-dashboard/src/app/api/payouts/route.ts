export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getPayouts } from "@/lib/store";

export async function GET() {
  const payouts = await getPayouts();
  return NextResponse.json({ payouts });
}
