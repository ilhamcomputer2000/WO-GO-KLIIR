import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  fetchMitraPayouts,
  fetchWorkOrder,
  getPayoutStatusLabel,
  getVerificationLabel,
  resolveImageUrl,
  takeSlot,
  updateProgress,
  uploadProof,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { PayoutRecord } from "@/types";
import { useAuthStore } from "@/stores/auth-store";
import type { WorkOrder } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatDuration,
  getCommissionPerCso,
  getOpenSlotCount,
} from "@/lib/utils";

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mitra = useAuthStore((s) => s.mitra);
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [myPayout, setMyPayout] = useState<PayoutRecord | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initial load
  const load = async () => {
    if (!id) return;
    try {
      const res = await fetchWorkOrder(id);
      setWo(res.workOrder);
      if (mitra) {
        const payoutRes = await fetchMitraPayouts(mitra.id);
        const payout = payoutRes.payouts.find((p) => p.woId === id);
        setMyPayout(payout ?? null);
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Gagal memuat WO");
    } finally {
      setLoading(false);
    }
  };

  // Refresh payout from API (lightweight)
  const refreshPayout = async () => {
    if (!mitra || !id) return;
    try {
      const payoutRes = await fetchMitraPayouts(mitra.id);
      const payout = payoutRes.payouts.find((p) => p.woId === id);
      setMyPayout(payout ?? null);
    } catch {
      // silent
    }
  };

  // Refresh WO from API
  const refreshWo = async () => {
    if (!id) return;
    try {
      const res = await fetchWorkOrder(id);
      setWo(res.workOrder);
    } catch {
      // silent
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();

      // Subscribe to Supabase Realtime changes
      const channel = supabase
        .channel(`wo-detail-${id}`)
        // Listen to work_orders table changes for this WO
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "work_orders",
            filter: `id=eq.${id}`,
          },
          () => {
            refreshWo();
          }
        )
        // Listen to payouts table changes for this mitra + WO
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payouts",
            filter: `wo_id=eq.${id}`,
          },
          () => {
            refreshPayout();
          }
        )
        .subscribe();

      channelRef.current = channel;

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    }, [id, mitra?.id])
  );

  const handleUpdateProgress = async (progress: number) => {
    if (!mitra || !wo) return;
    setUpdating(true);
    try {
      const res = await updateProgress(wo.id, mitra.id, progress);
      setWo(res.workOrder);
      if (progress >= 100) {
        Alert.alert("Selesai!", "Pekerjaan Anda telah ditandai selesai.");
      } else {
        Alert.alert("Tersimpan", `Progress diperbarui ke ${progress}%`);
      }
    } catch (e) {
      Alert.alert(
        "Gagal",
        e instanceof Error ? e.message : "Tidak bisa update progress"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadProof = async (useCamera: boolean) => {
    if (!mitra || !wo) return;

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses kamera/galeri untuk upload bukti.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsEditing: true,
        });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const res = await uploadProof(
        wo.id,
        mitra.id,
        asset.uri,
        asset.mimeType ?? "image/jpeg"
      );
      setWo(res.workOrder);
      Alert.alert("Berhasil", "Bukti penyelesaian berhasil diunggah.");
    } catch (e) {
      Alert.alert(
        "Gagal",
        e instanceof Error ? e.message : "Tidak bisa upload bukti"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTakeSlot = async () => {
    if (!mitra || !wo) return;

    const mySlot = wo.slots.find((s) => s.mitraId === mitra.id);
    if (mySlot) {
      Alert.alert("Info", "Anda sudah mengambil slot di WO ini.");
      return;
    }

    Alert.alert(
      "Ambil Slot CSO",
      `Ambil 1 slot untuk pekerjaan ini?\nKomisi: ${formatCurrency(getCommissionPerCso(wo))}`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ambil Slot",
          onPress: async () => {
            setTaking(true);
            try {
              const res = await takeSlot(wo.id, mitra.id);
              setWo(res.workOrder);
              Alert.alert(
                "Berhasil!",
                `Slot ${res.slot.slotNumber} berhasil diambil. Selamat bekerja!`,
                [{ text: "OK", onPress: () => router.push("/(tabs)/my-work") }]
              );
            } catch (e) {
              Alert.alert(
                "Gagal",
                e instanceof Error ? e.message : "Tidak bisa ambil slot"
              );
            } finally {
              setTaking(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !wo) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  const openSlots = getOpenSlotCount(wo);
  const mySlot = wo.slots.find((s) => s.mitraId === mitra?.id);
  const canTake = !mySlot && openSlots > 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.id}>{wo.id}</Text>
      <Text style={styles.title}>{wo.title}</Text>
      <Text style={styles.desc}>{wo.description}</Text>

      <View style={styles.infoGrid}>
        <InfoItem label="Kategori" value={wo.category} />
        <InfoItem label="Lokasi" value={wo.location} />
        <InfoItem label="Tanggal" value={formatDate(wo.workDate)} />
        <InfoItem label="Jam" value={`${wo.startTime} – ${wo.endTime}`} />
        <InfoItem label="Durasi/CSO" value={formatDuration(wo.durationMinutes)} />
        <InfoItem
          label="Komisi/CSO"
          value={formatCurrency(getCommissionPerCso(wo))}
          highlight
        />
      </View>

      <Text style={styles.sectionTitle}>
        Slot CSO ({wo.requiredCso - openSlots}/{wo.requiredCso} terisi)
      </Text>
      {wo.slots.map((slot) => (
        <View
          key={slot.id}
          style={[
            styles.slotRow,
            slot.mitraId === mitra?.id && styles.slotMine,
          ]}
        >
          <Text style={styles.slotNum}>Slot {slot.slotNumber}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.slotStatus}>
              {slot.status === "open"
                ? "Terbuka"
                : slot.mitraId === mitra?.id
                  ? "Anda"
                  : slot.mitraName ?? "Terisi"}
            </Text>
            {slot.progress !== undefined && slot.status !== "open" && (
              <Text style={styles.slotProgress}>{slot.progress}%</Text>
            )}
          </View>
        </View>
      ))}

      {canTake && (
        <TouchableOpacity
          style={[styles.takeBtn, taking && styles.takeBtnDisabled]}
          onPress={handleTakeSlot}
          disabled={taking}
        >
          {taking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.takeBtnText}>
              Ambil Slot ({openSlots} tersisa)
            </Text>
          )}
        </TouchableOpacity>
      )}

      {mySlot && (
        <View style={styles.proofSection}>
          <Text style={styles.sectionTitle}>Bukti Penyelesaian</Text>
          {mySlot.proofUrl ? (
            <Image
              source={{ uri: resolveImageUrl(mySlot.proofUrl) }}
              style={styles.proofImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.proofHint}>
              Unggah foto bukti pekerjaan (sebelum/sesudah selesai)
            </Text>
          )}
          <View style={styles.proofBtns}>
            <TouchableOpacity
              style={[styles.proofBtn, uploading && styles.proofBtnDisabled]}
              onPress={() => handleUploadProof(true)}
              disabled={uploading}
            >
              <Text style={styles.proofBtnText}>Ambil Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.proofBtnOutline, uploading && styles.proofBtnDisabled]}
              onPress={() => handleUploadProof(false)}
              disabled={uploading}
            >
              <Text style={styles.proofBtnOutlineText}>Dari Galeri</Text>
            </TouchableOpacity>
          </View>
          {uploading && (
            <ActivityIndicator color="#2e7d32" style={{ marginTop: 8 }} />
          )}
        </View>
      )}

      {mySlot && mySlot.status !== "completed" && (
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Update Progress Anda</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${mySlot.progress ?? 0}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            Progress slot Anda: {mySlot.progress ?? 0}%
          </Text>
          <Text style={styles.progressWoLabel}>
            Progress total WO: {wo.progress}%
          </Text>
          <View style={styles.progressBtns}>
            {[25, 50, 75, 100].map((pct) => (
              <TouchableOpacity
                key={pct}
                style={[
                  styles.progressBtn,
                  (mySlot.progress ?? 0) >= pct && styles.progressBtnDone,
                ]}
                onPress={() => handleUpdateProgress(pct)}
                disabled={updating}
              >
                <Text
                  style={[
                    styles.progressBtnText,
                    (mySlot.progress ?? 0) >= pct && styles.progressBtnTextDone,
                  ]}
                >
                  {pct}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {updating && (
            <ActivityIndicator color="#2e7d32" style={{ marginTop: 8 }} />
          )}
        </View>
      )}

      {mySlot?.status === "completed" && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>
            Pekerjaan selesai — Slot {mySlot.slotNumber} ✓
          </Text>
          <Text style={styles.statusSubtext}>
            {getVerificationLabel(mySlot.verificationStatus)}
          </Text>
          {myPayout && (
            <Text style={styles.statusSubtext}>
              Komisi: {getPayoutStatusLabel(myPayout.status)}
            </Text>
          )}
          {myPayout?.status === "paid" && myPayout.transferProofUrl && (
            <Text style={styles.statusPaid}>
              Bukti transfer sudah diunggah admin ✓
            </Text>
          )}
          {mySlot.verificationStatus === "rejected" && (
            <Text style={styles.statusRejected}>
              Perbaiki pekerjaan, update progress, dan upload bukti ulang.
            </Text>
          )}
        </View>
      )}

      {openSlots === 0 && !mySlot && (
        <View style={styles.fullBanner}>
          <Text style={styles.fullText}>Semua slot sudah penuh</Text>
        </View>
      )}
    </ScrollView>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  id: { fontSize: 12, color: "#888", fontFamily: "monospace" },
  title: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a", marginTop: 4 },
  desc: { fontSize: 14, color: "#666", marginTop: 8, lineHeight: 20 },
  infoGrid: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e8f5e9",
  },
  infoItem: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: "#888" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  infoHighlight: { color: "#2e7d32", fontSize: 15 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  slotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  slotMine: { borderColor: "#2e7d32", backgroundColor: "#f1f8f1" },
  slotNum: { fontWeight: "600", color: "#333" },
  slotStatus: { color: "#666", fontSize: 13 },
  slotProgress: { color: "#2e7d32", fontSize: 11, fontWeight: "600", marginTop: 2 },
  proofSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e8f5e9",
  },
  proofImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#f0f0f0",
  },
  proofHint: { fontSize: 13, color: "#888", marginBottom: 10 },
  proofBtns: { flexDirection: "row", gap: 8 },
  proofBtn: {
    flex: 1,
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  proofBtnOutline: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2e7d32",
  },
  proofBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  proofBtnOutlineText: { color: "#2e7d32", fontWeight: "600", fontSize: 13 },
  proofBtnDisabled: { opacity: 0.6 },
  progressSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#e8f5e9",
  },
  progressBarBg: {
    height: 10,
    backgroundColor: "#e8f5e9",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2e7d32",
    borderRadius: 5,
  },
  progressLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  progressWoLabel: { fontSize: 12, color: "#888", marginTop: 2, marginBottom: 12 },
  progressBtns: { flexDirection: "row", gap: 8 },
  progressBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2e7d32",
    alignItems: "center",
  },
  progressBtnDone: { backgroundColor: "#2e7d32" },
  progressBtnText: { color: "#2e7d32", fontWeight: "600", fontSize: 13 },
  progressBtnTextDone: { color: "#fff" },
  completedBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
    alignItems: "center",
  },
  completedText: { color: "#2e7d32", fontWeight: "700", fontSize: 15 },
  statusSubtext: {
    color: "#555",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  statusPaid: {
    color: "#1565c0",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  statusRejected: {
    color: "#c62828",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  takeBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 32,
  },
  takeBtnDisabled: { opacity: 0.7 },
  takeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  takenBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 32,
    alignItems: "center",
  },
  takenText: { color: "#2e7d32", fontWeight: "600" },
  fullBanner: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 32,
    alignItems: "center",
  },
  fullText: { color: "#888" },
});
