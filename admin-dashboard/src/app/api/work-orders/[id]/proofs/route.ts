export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getProofsByWo } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proofs = await getProofsByWo(id);
  return NextResponse.json({ proofs });
}
