export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { updatePresence } from "@/lib/chat-store";

// POST /api/chat/presence — heartbeat to mark user online
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, userName, userType } = body;

  if (!userId || !userName) {
    return NextResponse.json({ error: "userId and userName are required" }, { status: 400 });
  }

  const presence = updatePresence(userId, userName, userType ?? "mitra");
  return NextResponse.json({ presence });
}
