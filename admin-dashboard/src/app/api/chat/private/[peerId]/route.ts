import { NextResponse } from "next/server";
import { getPrivateMessages } from "@/lib/chat-store";

// GET /api/chat/private/[peerId]?userId=xxx — get messages between two users
export async function GET(
  request: Request,
  { params }: { params: Promise<{ peerId: string }> }
) {
  const { peerId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const messages = getPrivateMessages(userId, peerId);
  return NextResponse.json({ messages });
}
