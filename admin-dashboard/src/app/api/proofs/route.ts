import { NextResponse } from "next/server";
import { getProofs } from "@/lib/store";

export async function GET() {
  const proofs = await getProofs();
  return NextResponse.json({ proofs });
}
