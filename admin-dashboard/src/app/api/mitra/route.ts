import { NextResponse } from "next/server";
import { getMitraList } from "@/lib/store";

export async function GET() {
  const mitra = await getMitraList();
  return NextResponse.json({ mitra });
}
