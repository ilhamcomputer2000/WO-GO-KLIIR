import { NextResponse } from "next/server";
import {
  getGroupMessages,
  sendGroupMessage,
} from "@/lib/chat-store";

// GET /api/chat/group — fetch group messages
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);
  const before = searchParams.get("before") ?? undefined;
  const messages = getGroupMessages(limit, before);
  return NextResponse.json({ messages });
}

// POST /api/chat/group — send group message
export async function POST(request: Request) {
  const body = await request.json();
  const { senderId, senderName, senderType, message } = body;

  if (!senderId || !senderName || !message?.trim()) {
    return NextResponse.json({ error: "senderId, senderName, and message are required" }, { status: 400 });
  }

  const msg = sendGroupMessage(
    senderId,
    senderName,
    senderType ?? "mitra",
    message.trim()
  );

  return NextResponse.json({ message: msg });
}
