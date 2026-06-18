"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { API_URL } from "@/constants/config";
import { ScreenHeader } from "@/components/ScreenHeader";

// ── Types ──
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: "mitra" | "admin";
  chatType: "group" | "private";
  recipientId?: string;
  message: string;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  type: "mitra" | "admin";
  isOnline: boolean;
  lastSeen: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return res.json() as Promise<T>;
}

export default function ChatScreen() {
  const mitra = useAuthStore((s) => s.mitra);
  const [activeTab, setActiveTab] = useState<"group" | "private">("group");

  // Group chat state
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [groupInput, setGroupInput] = useState("");
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupSending, setGroupSending] = useState(false);
  const groupListRef = useRef<FlatList>(null);

  // Private chat state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [privatePeer, setPrivatePeer] = useState<Contact | null>(null);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [privateInput, setPrivateInput] = useState("");
  const [privateSending, setPrivateSending] = useState(false);
  const [privateLoading, setPrivateLoading] = useState(false);
  const privateListRef = useRef<FlatList>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Presence heartbeat ──
  const sendHeartbeat = useCallback(async () => {
    if (!mitra) return;
    try {
      await api("/api/chat/presence", {
        method: "POST",
        body: JSON.stringify({ userId: mitra.id, userName: mitra.name, userType: "mitra" }),
      });
    } catch { /* silent */ }
  }, [mitra?.id]);

  useFocusEffect(
    useCallback(() => {
      sendHeartbeat();
      presenceRef.current = setInterval(sendHeartbeat, 30_000);
      return () => {
        if (presenceRef.current) clearInterval(presenceRef.current);
      };
    }, [sendHeartbeat])
  );

  // ── Group chat ──
  const loadGroupMessages = useCallback(async () => {
    try {
      const data = await api<{ messages: ChatMessage[] }>("/api/chat/group");
      setGroupMessages(data.messages);
    } catch { /* silent */ }
    setGroupLoading(false);
  }, []);

  const sendGroupMsg = async () => {
    if (!mitra || !groupInput.trim() || groupSending) return;
    setGroupSending(true);
    try {
      await api("/api/chat/group", {
        method: "POST",
        body: JSON.stringify({
          senderId: mitra.id,
          senderName: mitra.name,
          senderType: "mitra",
          message: groupInput.trim(),
        }),
      });
      setGroupInput("");
      await loadGroupMessages();
      setTimeout(() => groupListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { /* silent */ }
    setGroupSending(false);
  };

  // ── Contacts ──
  const loadContacts = useCallback(async () => {
    if (!mitra) return;
    try {
      const data = await api<{ contacts: Contact[] }>(`/api/chat/contacts?userId=${mitra.id}`);
      setContacts(data.contacts);
    } catch { /* silent */ }
    setContactsLoading(false);
  }, [mitra?.id]);

  // ── Private chat ──
  const loadPrivateMessages = useCallback(async (peerId: string) => {
    if (!mitra) return;
    try {
      const data = await api<{ messages: ChatMessage[] }>(
        `/api/chat/private/${peerId}?userId=${mitra.id}`
      );
      setPrivateMessages(data.messages);
    } catch { /* silent */ }
    setPrivateLoading(false);
  }, [mitra?.id]);

  const sendPrivateMsg = async () => {
    if (!mitra || !privatePeer || !privateInput.trim() || privateSending) return;
    setPrivateSending(true);
    try {
      await api("/api/chat/private", {
        method: "POST",
        body: JSON.stringify({
          senderId: mitra.id,
          senderName: mitra.name,
          senderType: "mitra",
          recipientId: privatePeer.id,
          message: privateInput.trim(),
        }),
      });
      setPrivateInput("");
      await loadPrivateMessages(privatePeer.id);
      setTimeout(() => privateListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { /* silent */ }
    setPrivateSending(false);
  };

  // ── Polling ──
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    if (activeTab === "group") {
      setGroupLoading(true);
      loadGroupMessages();
      pollRef.current = setInterval(loadGroupMessages, 4000);
    } else if (activeTab === "private" && !privatePeer) {
      setContactsLoading(true);
      loadContacts();
      pollRef.current = setInterval(loadContacts, 5000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeTab, privatePeer]);

  // When entering private chat with a peer, poll that conversation
  useEffect(() => {
    if (!privatePeer) return;
    setPrivateLoading(true);
    loadPrivateMessages(privatePeer.id);
    const iv = setInterval(() => loadPrivateMessages(privatePeer.id), 4000);
    return () => clearInterval(iv);
  }, [privatePeer?.id]);

  if (!mitra) return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastSeen = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;

    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return `Hari ini ${formatTime(iso)}`;

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Private Chat Room View ──
  if (privatePeer) {
    return (
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setPrivatePeer(null)} style={styles.chatBackBtn}>
            <Ionicons name="chevron-back" size={20} color="#2e7d32" />
          </TouchableOpacity>
          <View style={styles.chatHeaderAvatar}>
            <Text style={styles.chatHeaderInitial}>
              {privatePeer.name.charAt(0).toUpperCase()}
            </Text>
            <View style={[styles.onlineDotSmall, { backgroundColor: privatePeer.isOnline ? "#4caf50" : "#bbb" }]} />
          </View>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName} numberOfLines={1}>{privatePeer.name}</Text>
            <Text style={styles.chatHeaderStatus}>
              {privatePeer.isOnline ? "Online" : `Offline • ${formatLastSeen(privatePeer.lastSeen)}`}
            </Text>
          </View>
          {privatePeer.type === "admin" && (
            <View style={styles.adminTag}>
              <Text style={styles.adminTagText}>Admin</Text>
            </View>
          )}
        </View>

        {/* Messages */}
        {privateLoading && privateMessages.length === 0 ? (
          <View style={styles.loadingWrap}><ActivityIndicator color="#2e7d32" /></View>
        ) : (
          <FlatList
            ref={privateListRef}
            data={privateMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isMe = item.senderId === mitra.id;
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubblePeer]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.message}</Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatTime(item.createdAt)}</Text>
                </View>
              );
            }}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => privateListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>Belum ada pesan. Mulai percakapan!</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.inputField}
            value={privateInput}
            onChangeText={setPrivateInput}
            placeholder="Tulis pesan..."
            placeholderTextColor="#aaa"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!privateInput.trim() || privateSending) && styles.sendBtnDisabled]}
            onPress={sendPrivateMsg}
            disabled={!privateInput.trim() || privateSending}
          >
            {privateSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Main Chat View with Tabs ──
  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScreenHeader
        title="Chat"
        extraRight={
          <TouchableOpacity style={styles.gearBtn} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={20} color="#666" />
          </TouchableOpacity>
        }
      />

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "group" && styles.tabActive]}
          onPress={() => setActiveTab("group")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "group" ? "#2e7d32" : "#999"}
          />
          <Text style={[styles.tabText, activeTab === "group" && styles.tabTextActive]}>
            Chat Umum
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "private" && styles.tabActive]}
          onPress={() => setActiveTab("private")}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={16}
            color={activeTab === "private" ? "#2e7d32" : "#999"}
          />
          <Text style={[styles.tabText, activeTab === "private" && styles.tabTextActive]}>
            Chat Pribadi
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "group" ? (
        /* ── GROUP CHAT ── */
        <>
          {groupLoading && groupMessages.length === 0 ? (
            <View style={styles.loadingWrap}><ActivityIndicator color="#2e7d32" /></View>
          ) : (
            <FlatList
              ref={groupListRef}
              data={groupMessages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isMe = item.senderId === mitra.id;
                const isAdmin = item.senderType === "admin";
                return (
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubblePeer]}>
                    {!isMe && (
                      <View style={styles.senderRow}>
                        <Text style={[styles.senderName, isAdmin && { color: "#1565c0" }]}>
                          {item.senderName}
                        </Text>
                        {isAdmin && (
                          <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>Admin</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.message}</Text>
                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{formatTime(item.createdAt)}</Text>
                  </View>
                );
              }}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => groupListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <View style={styles.emptyChatIconBig}>
                    <Ionicons name="chatbubbles-outline" size={40} color="#2e7d32" />
                  </View>
                  <Text style={styles.emptyChatTitle}>Chat Umum</Text>
                  <Text style={styles.emptyChatText}>
                    Kirim pesan pertama untuk memulai diskusi dengan semua mitra dan admin.
                  </Text>

                  {/* Quick Action Cards */}
                  <View style={styles.quickActionsRow}>
                    <View style={styles.quickActionCard}>
                      <Ionicons name="bulb-outline" size={22} color="#2e7d32" />
                      <Text style={styles.quickActionLabel}>TIPS KERJA</Text>
                    </View>
                    <View style={styles.quickActionCard}>
                      <Ionicons name="megaphone-outline" size={22} color="#2e7d32" />
                      <Text style={styles.quickActionLabel}>INFO TERBARU</Text>
                    </View>
                  </View>
                </View>
              }
            />
          )}

          {/* Group Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.inputField}
              value={groupInput}
              onChangeText={setGroupInput}
              placeholder="Tulis pesan ke grup..."
              placeholderTextColor="#aaa"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!groupInput.trim() || groupSending) && styles.sendBtnDisabled]}
              onPress={sendGroupMsg}
              disabled={!groupInput.trim() || groupSending}
            >
              {groupSending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* ── PRIVATE CONTACTS LIST ── */
        <>
          {contactsLoading && contacts.length === 0 ? (
            <View style={styles.loadingWrap}><ActivityIndicator color="#2e7d32" /></View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => setPrivatePeer(item)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                    <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? "#4caf50" : "#bbb" }]} />
                  </View>

                  {/* Info */}
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                      {item.type === "admin" && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    {item.isOnline ? (
                      <Text style={styles.contactOnline}>Online sekarang</Text>
                    ) : (
                      <Text style={styles.contactOffline}>
                        Offline • {formatLastSeen(item.lastSeen)}
                      </Text>
                    )}
                    {item.lastMessage && (
                      <Text style={styles.contactLastMsg} numberOfLines={1}>{item.lastMessage}</Text>
                    )}
                  </View>

                  {/* Right side */}
                  <View style={styles.contactRight}>
                    {item.lastMessageAt && (
                      <Text style={styles.contactTime}>{formatTime(item.lastMessageAt)}</Text>
                    )}
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : undefined}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <View style={styles.emptyChatIconBig}>
                    <Ionicons name="people-outline" size={40} color="#2e7d32" />
                  </View>
                  <Text style={styles.emptyChatTitle}>Chat Pribadi</Text>
                  <Text style={styles.emptyChatText}>
                    Belum ada kontak. Kontak akan muncul saat ada mitra atau admin lain yang online.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f4f7f4" },

  // Gear button
  gearBtn: { padding: 4 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef3ee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#2e7d32" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#999" },
  tabTextActive: { color: "#2e7d32" },

  // Chat header (private)
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef3ee",
    gap: 10,
  },
  chatBackBtn: { padding: 4 },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderInitial: { color: "#fff", fontSize: 16, fontWeight: "700" },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 15, fontWeight: "700", color: "#111" },
  chatHeaderStatus: { fontSize: 11, color: "#888", marginTop: 2 },
  adminTag: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminTagText: { fontSize: 10, fontWeight: "700", color: "#1565c0" },

  // Messages
  messagesList: { padding: 12, paddingBottom: 8, flexGrow: 1 },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    marginBottom: 6,
  },
  bubbleMe: {
    backgroundColor: "#2e7d32",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubblePeer: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#eef3ee",
  },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  senderName: { fontSize: 11, fontWeight: "700", color: "#2e7d32" },
  adminBadge: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminBadgeText: { fontSize: 9, fontWeight: "700", color: "#1565c0" },
  bubbleText: { fontSize: 14, color: "#222", lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: "#999", marginTop: 4, textAlign: "right" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)" },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eef3ee",
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#c8e6c9" },

  // Contact list
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
  },
  onlineDotSmall: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactName: { fontSize: 15, fontWeight: "700", color: "#111" },
  contactOnline: { fontSize: 12, color: "#4caf50", fontWeight: "500", marginTop: 2 },
  contactOffline: { fontSize: 11, color: "#999", marginTop: 2 },
  contactLastMsg: { fontSize: 12, color: "#777", marginTop: 3 },
  contactRight: { alignItems: "flex-end", gap: 4 },
  contactTime: { fontSize: 10, color: "#bbb" },
  unreadBadge: {
    backgroundColor: "#2e7d32",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  // Empty & loading
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  emptyChat: { alignItems: "center", padding: 32 },
  emptyChatIconBig: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyChatTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  emptyChatText: { color: "#888", textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },

  // Quick actions
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
    width: "100%",
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eef3ee",
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 0.5,
  },
});
