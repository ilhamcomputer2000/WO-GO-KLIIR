/**
 * In-memory chat store for group & private messaging + online presence.
 * This is a simple polling-based solution. For production, migrate to Supabase Realtime.
 */

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "mitra" | "admin";
  chatType: "group" | "private";
  recipientId?: string; // null for group
  message: string;
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  userType: "mitra" | "admin";
  isOnline: boolean;
  lastSeen: string;
}

export interface Contact {
  id: string;
  name: string;
  type: "mitra" | "admin";
  isOnline: boolean;
  lastSeen: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

// ── In-memory storage ──
const groupMessages: ChatMessage[] = [];
const privateMessages: ChatMessage[] = [];
const presenceMap = new Map<string, UserPresence>();

let idCounter = 1;
function nextId() {
  return `msg-${Date.now()}-${idCounter++}`;
}

// ── Presence ──

export function updatePresence(
  userId: string,
  userName: string,
  userType: "mitra" | "admin"
): UserPresence {
  const now = new Date().toISOString();
  const existing = presenceMap.get(userId);
  const presence: UserPresence = {
    userId,
    userName: userName || existing?.userName || "Unknown",
    userType,
    isOnline: true,
    lastSeen: now,
  };
  presenceMap.set(userId, presence);
  return presence;
}

export function setOffline(userId: string): void {
  const p = presenceMap.get(userId);
  if (p) {
    p.isOnline = false;
    p.lastSeen = new Date().toISOString();
  }
}

// Auto-offline: mark users as offline if no heartbeat in 60 seconds
function checkStalePresence() {
  const cutoff = Date.now() - 60_000;
  for (const [, p] of presenceMap) {
    if (p.isOnline && new Date(p.lastSeen).getTime() < cutoff) {
      p.isOnline = false;
    }
  }
}

export function getAllPresence(): UserPresence[] {
  checkStalePresence();
  return Array.from(presenceMap.values());
}

export function getPresence(userId: string): UserPresence | undefined {
  checkStalePresence();
  return presenceMap.get(userId);
}

// ── Group Chat ──

export function sendGroupMessage(
  senderId: string,
  senderName: string,
  senderType: "mitra" | "admin",
  message: string
): ChatMessage {
  const msg: ChatMessage = {
    id: nextId(),
    senderId,
    senderName,
    senderType,
    chatType: "group",
    message,
    createdAt: new Date().toISOString(),
  };
  groupMessages.push(msg);
  // Keep last 500 messages
  if (groupMessages.length > 500) groupMessages.splice(0, groupMessages.length - 500);
  return msg;
}

export function getGroupMessages(limit = 100, before?: string): ChatMessage[] {
  let msgs = groupMessages;
  if (before) {
    const idx = msgs.findIndex((m) => m.id === before);
    if (idx > 0) msgs = msgs.slice(0, idx);
  }
  return msgs.slice(-limit);
}

// ── Private Chat ──

export function sendPrivateMessage(
  senderId: string,
  senderName: string,
  senderType: "mitra" | "admin",
  recipientId: string,
  message: string
): ChatMessage {
  const msg: ChatMessage = {
    id: nextId(),
    senderId,
    senderName,
    senderType,
    chatType: "private",
    recipientId,
    message,
    createdAt: new Date().toISOString(),
  };
  privateMessages.push(msg);
  if (privateMessages.length > 2000) privateMessages.splice(0, privateMessages.length - 2000);
  return msg;
}

export function getPrivateMessages(
  userId: string,
  peerId: string,
  limit = 100
): ChatMessage[] {
  const msgs = privateMessages.filter(
    (m) =>
      (m.senderId === userId && m.recipientId === peerId) ||
      (m.senderId === peerId && m.recipientId === userId)
  );
  return msgs.slice(-limit);
}

export function getConversations(userId: string): Contact[] {
  checkStalePresence();

  // Find all peers this user has chatted with
  const peerMap = new Map<string, { lastMsg: ChatMessage; unread: number }>();

  for (const m of privateMessages) {
    const isMyMsg = m.senderId === userId;
    const isPeerMsg = m.recipientId === userId;
    if (!isMyMsg && !isPeerMsg) continue;

    const peerId = isMyMsg ? m.recipientId! : m.senderId;
    const existing = peerMap.get(peerId);

    if (!existing || new Date(m.createdAt) > new Date(existing.lastMsg.createdAt)) {
      peerMap.set(peerId, {
        lastMsg: m,
        unread: (existing?.unread ?? 0) + (isPeerMsg ? 1 : 0),
      });
    } else if (isPeerMsg) {
      existing.unread++;
    }
  }

  // Also add all known presences that user hasn't chatted with yet
  for (const [pId, p] of presenceMap) {
    if (pId === userId) continue;
    if (!peerMap.has(pId)) {
      // Don't add them as contacts unless they've chatted
    }
  }

  const contacts: Contact[] = [];
  for (const [peerId, data] of peerMap) {
    const presence = presenceMap.get(peerId);
    contacts.push({
      id: peerId,
      name: presence?.userName ?? data.lastMsg.senderName,
      type: presence?.userType ?? data.lastMsg.senderType,
      isOnline: presence?.isOnline ?? false,
      lastSeen: presence?.lastSeen ?? data.lastMsg.createdAt,
      lastMessage: data.lastMsg.message,
      lastMessageAt: data.lastMsg.createdAt,
      unreadCount: data.unread,
    });
  }

  // Sort by last message time (newest first)
  contacts.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return contacts;
}

// Get all users (for starting new conversations)
export function getAllContacts(excludeUserId: string): Contact[] {
  checkStalePresence();
  const contacts: Contact[] = [];

  for (const [userId, p] of presenceMap) {
    if (userId === excludeUserId) continue;
    
    // Find last message with this user
    const lastMsg = [...privateMessages]
      .reverse()
      .find(
        (m) =>
          (m.senderId === excludeUserId && m.recipientId === userId) ||
          (m.senderId === userId && m.recipientId === excludeUserId)
      );

    contacts.push({
      id: userId,
      name: p.userName,
      type: p.userType,
      isOnline: p.isOnline,
      lastSeen: p.lastSeen,
      lastMessage: lastMsg?.message,
      lastMessageAt: lastMsg?.createdAt,
      unreadCount: 0,
    });
  }

  // Sort: online first, then by name
  contacts.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return contacts;
}

// Seed admin presence so admin always shows up
updatePresence("admin", "Admin GO KLIRR", "admin");
setOffline("admin"); // Admin starts offline
