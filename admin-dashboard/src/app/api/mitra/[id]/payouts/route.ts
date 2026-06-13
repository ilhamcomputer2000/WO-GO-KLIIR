import { NextResponse } from "next/server";
import { getMitraPayouts } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payouts = await getMitraPayouts(id);
  return NextResponse.json({ payouts });
}
