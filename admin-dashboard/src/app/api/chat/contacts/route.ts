export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getAllContacts } from "@/lib/chat-store";

// GET /api/chat/contacts?userId=xxx — get all known users with online status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const contacts = getAllContacts(userId);
  return NextResponse.json({ contacts });
}
