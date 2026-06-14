import { NextResponse } from "next/server";
import {
  sendPrivateMessage,
  getConversations,
} from "@/lib/chat-store";

// GET /api/chat/private?userId=xxx — get conversation list for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const conversations = getConversations(userId);
  return NextResponse.json({ conversations });
}

// POST /api/chat/private — send private message
export async function POST(request: Request) {
  const body = await request.json();
  const { senderId, senderName, senderType, recipientId, message } = body;

  if (!senderId || !senderName || !recipientId || !message?.trim()) {
    return NextResponse.json(
      { error: "senderId, senderName, recipientId, and message are required" },
      { status: 400 }
    );
  }

  const msg = sendPrivateMessage(
    senderId,
    senderName,
    senderType ?? "mitra",
    recipientId,
    message.trim()
  );

  return NextResponse.json({ message: msg });
}
