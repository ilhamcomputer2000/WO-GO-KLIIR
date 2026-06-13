import { NextResponse } from "next/server";
import { getFullState } from "@/lib/store";

export async function GET() {
  const state = await getFullState();
  return NextResponse.json(state);
}
