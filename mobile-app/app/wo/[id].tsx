"use client";
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
  TextInput,
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
  uploadProof,
} from "@/lib/api";
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
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [myPayout, setMyPayout] = useState<PayoutRecord | null>(null);
  const [beforeRemark, setBeforeRemark] = useState("");
  const [afterRemark, setAfterRemark] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (silent = false) => {
    if (!id) return;
    try {
      const res = await fetchWorkOrder(id);
      setWo(res.workOrder);
      if (mitra) {
        const payoutRes = await fetchMitraPayouts(mitra.id);
        // Pick the most relevant payout: prioritize non-rejected over rejected
        const matching = payoutRes.payouts.filter((p) => p.woId === id);
        const payout = matching.find((p) => p.status !== "rejected") ?? matching[0];
        setMyPayout(payout ?? null);
      }
    } catch (e) {
      if (!silent) {
        Alert.alert("Error", e instanceof Error ? e.message : "Gagal memuat WO");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
      intervalRef.current = setInterval(() => load(true), 8000);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [id, mitra?.id])
  );

  const pickAndUpload = async (
    proofType: "before" | "after",
    useCamera: boolean
  ) => {
    if (!mitra || !wo) return;

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses kamera/galeri.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });

    if (result.canceled || !result.assets[0]) return;

    const manualRemark = proofType === "before" ? beforeRemark : afterRemark;
    const fullRemark = manualRemark.trim() || undefined;
    const asset = result.assets[0];
    setUploading(proofType);
    try {
      const res = await uploadProof(wo.id, mitra.id, asset.uri, asset.mimeType ?? "image/jpeg", proofType, fullRemark);
      setWo(res.workOrder);
      if (proofType === "before") setBeforeRemark("");
      else setAfterRemark("");
      Alert.alert(
        "Berhasil",
        proofType === "before"
          ? "Foto sebelum pekerjaan berhasil diunggah."
          : "Foto setelah pekerjaan berhasil diunggah. Pekerjaan ditandai selesai!"
      );
    } catch (e) {
      Alert.alert("Gagal", e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(null);
    }
  };

  const handleTakeSlot = async () => {
    if (!mitra || !wo) return;
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
              Alert.alert("Gagal", e instanceof Error ? e.message : "Tidak bisa ambil slot");
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
  const progress = mySlot?.progress ?? 0;

  // Determine which photos are rejected (partial reject support)
  const rejectedPhotos = mySlot?.rejectedPhotoTypes ?? [];
  const isBeforeRejected = rejectedPhotos.includes("before");
  const isAfterRejected = rejectedPhotos.includes("after");
  const hasAnyRejection = mySlot?.verificationStatus === "rejected";
  // Fallback: if rejected but no specific photo types recorded, both need re-upload
  const bothRejectedFallback = hasAnyRejection && rejectedPhotos.length === 0;

  const isBeforeNeedsUpload = hasAnyRejection
    ? (isBeforeRejected || bothRejectedFallback || !mySlot?.beforePhotoUrl)
    : !mySlot?.beforePhotoUrl;
  const isAfterNeedsUpload = hasAnyRejection
    ? (isAfterRejected || bothRejectedFallback || !mySlot?.afterPhotoUrl)
    : !mySlot?.afterPhotoUrl;

  // Show photo card when: slot is active (taken) OR rejected state
  const showPhotoCards = mySlot && (mySlot.status === "taken" || hasAnyRejection);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.id}>{wo.id}</Text>
      <Text style={styles.title}>{wo.title}</Text>
      <Text style={styles.desc}>{wo.description}</Text>

      <View style={styles.infoGrid}>
        <InfoItem label="Kategori" value={wo.category} />
        <InfoItem label="Lokasi" value={wo.location} />
        <InfoItem label="Tanggal" value={formatDate(wo.workDate)} />
        <InfoItem label="Jam" value={`${wo.startTime} – ${wo.endTime}`} />
        <InfoItem label="Durasi/CSO" value={formatDuration(wo.durationMinutes)} />
        <InfoItem label="Komisi/CSO" value={formatCurrency(getCommissionPerCso(wo))} highlight />
      </View>

      {/* Slot list */}
      <Text style={styles.sectionTitle}>
        Slot CSO ({wo.requiredCso - openSlots}/{wo.requiredCso} terisi)
      </Text>
      {wo.slots.map((slot) => (
        <View key={slot.id} style={[styles.slotRow, slot.mitraId === mitra?.id && styles.slotMine]}>
          <Text style={styles.slotNum}>Slot {slot.slotNumber}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.slotStatus}>
              {slot.status === "open" ? "Terbuka" : slot.mitraId === mitra?.id ? "Anda" : slot.mitraName ?? "Terisi"}
            </Text>
            {slot.progress !== undefined && slot.status !== "open" && (
              <Text style={styles.slotProgress}>{slot.progress}%</Text>
            )}
          </View>
        </View>
      ))}

      {/* Ambil slot */}
      {canTake && (
        <TouchableOpacity
          style={[styles.takeBtn, taking && styles.takeBtnDisabled]}
          onPress={handleTakeSlot}
          disabled={taking}
        >
          {taking ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.takeBtnText}>Ambil Slot ({openSlots} tersisa)</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Progress bar */}
      {mySlot && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress Pekerjaan</Text>
            <Text style={styles.progressPct}>{progress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
          </View>
          <View style={styles.progressSteps}>
            <ProgressStep done={progress >= 0} label="Ambil slot" />
            <ProgressStep done={progress >= 50} label="Foto sebelum" />
            <ProgressStep done={progress >= 100} label="Foto setelah" />
          </View>
        </View>
      )}

      {/* ── Rejection notice banner ── */}
      {hasAnyRejection && mySlot && (
        <View style={styles.rejectionBanner}>
          <Text style={styles.rejectionTitle}>⚠️ Foto Ditolak Admin</Text>
          {mySlot.rejectionReason ? (
            <Text style={styles.rejectionReason}>Alasan: {mySlot.rejectionReason}</Text>
          ) : null}
          <View style={styles.rejectionTags}>
            {isBeforeRejected && (
              <View style={styles.rejectionTag}>
                <Text style={styles.rejectionTagText}>📷 Foto Sebelum perlu diupload ulang</Text>
              </View>
            )}
            {isAfterRejected && (
              <View style={styles.rejectionTag}>
                <Text style={styles.rejectionTagText}>✅ Foto Setelah perlu diupload ulang</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Foto SEBELUM ── */}
      {showPhotoCards && (
        <View style={styles.photoCard}>
          <View style={styles.photoCardHeader}>
            <View style={[styles.photoBadge, { backgroundColor: (isBeforeRejected || bothRejectedFallback) ? "#ffebee" : "#fff3e0" }]}>
              <Text style={[styles.photoBadgeText, { color: (isBeforeRejected || bothRejectedFallback) ? "#c62828" : "#e65100" }]}>
                {(isBeforeRejected || bothRejectedFallback) ? "✗ SEBELUM" : "SEBELUM"}
              </Text>
            </View>
            <Text style={styles.photoCardTitle}>Foto Sebelum Mulai</Text>
          </View>

          {/* Show existing photo only if it exists AND is not rejected */}
          {mySlot?.beforePhotoUrl && !isBeforeNeedsUpload ? (
            <>
              <Image source={{ uri: resolveImageUrl(mySlot.beforePhotoUrl) }} style={styles.proofImage} resizeMode="cover" />
              {mySlot.beforeRemark ? (
                <View style={styles.remarkDisplay}>
                  <Text style={styles.remarkLabel}>Catatan:</Text>
                  <Text style={styles.remarkText}>{mySlot.beforeRemark}</Text>
                </View>
              ) : null}
              <View style={styles.uploadedBadge}>
                <Text style={styles.uploadedText}>✓ Foto sebelum sudah diunggah</Text>
              </View>
            </>
          ) : (
            <>
              {isBeforeNeedsUpload && hasAnyRejection ? (
                <View style={styles.rejectedPhotoBanner}>
                  <Text style={styles.rejectedPhotoText}>Foto ini ditolak — upload foto baru yang benar</Text>
                </View>
              ) : (
                <Text style={styles.photoHint}>Ambil foto kondisi area/peralatan sebelum mulai pekerjaan</Text>
              )}
              <TextInput
                style={styles.remarkInput}
                placeholder="Catatan sebelum mulai (opsional)..."
                value={beforeRemark}
                onChangeText={setBeforeRemark}
                multiline
                numberOfLines={2}
                placeholderTextColor="#aaa"
              />
              <View style={styles.photoBtns}>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: (isBeforeRejected || bothRejectedFallback) ? "#c62828" : "#e65100" }, uploading === "before" && styles.photoBtnDisabled]}
                  onPress={() => pickAndUpload("before", true)}
                  disabled={uploading !== null}
                >
                  <Text style={styles.photoBtnText}>📷 Ambil Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoBtnOutline, uploading === "before" && styles.photoBtnDisabled]}
                  onPress={() => pickAndUpload("before", false)}
                  disabled={uploading !== null}
                >
                  <Text style={styles.photoBtnOutlineText}>🖼 Dari Galeri</Text>
                </TouchableOpacity>
              </View>
              {uploading === "before" && <ActivityIndicator color="#e65100" style={{ marginTop: 8 }} />}
            </>
          )}
        </View>
      )}

      {/* ── Foto SETELAH — muncul jika before sudah ada atau after direject ── */}
      {showPhotoCards && (mySlot?.beforePhotoUrl || isAfterNeedsUpload) && (
        <View style={styles.photoCard}>
          <View style={styles.photoCardHeader}>
            <View style={[styles.photoBadge, { backgroundColor: (isAfterRejected || bothRejectedFallback) ? "#ffebee" : "#e8f5e9" }]}>
              <Text style={[styles.photoBadgeText, { color: (isAfterRejected || bothRejectedFallback) ? "#c62828" : "#2e7d32" }]}>
                {(isAfterRejected || bothRejectedFallback) ? "✗ SETELAH" : "SETELAH"}
              </Text>
            </View>
            <Text style={styles.photoCardTitle}>Foto Setelah Selesai</Text>
          </View>

          {mySlot?.afterPhotoUrl && !isAfterNeedsUpload ? (
            <>
              <Image source={{ uri: resolveImageUrl(mySlot.afterPhotoUrl) }} style={styles.proofImage} resizeMode="cover" />
              {mySlot.afterRemark ? (
                <View style={styles.remarkDisplay}>
                  <Text style={styles.remarkLabel}>Catatan:</Text>
                  <Text style={styles.remarkText}>{mySlot.afterRemark}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {isAfterNeedsUpload && hasAnyRejection ? (
                <View style={styles.rejectedPhotoBanner}>
                  <Text style={styles.rejectedPhotoText}>Foto ini ditolak — upload foto baru yang benar</Text>
                </View>
              ) : (
                <Text style={styles.photoHint}>Ambil foto kondisi area/hasil pekerjaan setelah selesai</Text>
              )}
              <TextInput
                style={styles.remarkInput}
                placeholder="Catatan setelah selesai (opsional)..."
                value={afterRemark}
                onChangeText={setAfterRemark}
                multiline
                numberOfLines={2}
                placeholderTextColor="#aaa"
              />
              <View style={styles.photoBtns}>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: (isAfterRejected || bothRejectedFallback) ? "#c62828" : "#2e7d32" }, uploading === "after" && styles.photoBtnDisabled]}
                  onPress={() => pickAndUpload("after", true)}
                  disabled={uploading !== null}
                >
                  <Text style={styles.photoBtnText}>📷 Ambil Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoBtnOutline, uploading === "after" && styles.photoBtnDisabled]}
                  onPress={() => pickAndUpload("after", false)}
                  disabled={uploading !== null}
                >
                  <Text style={styles.photoBtnOutlineText}>🖼 Dari Galeri</Text>
                </TouchableOpacity>
              </View>
              {uploading === "after" && <ActivityIndicator color="#2e7d32" style={{ marginTop: 8 }} />}
            </>
          )}
        </View>
      )}

      {/* ── Completed banner — hanya tampil jika benar-benar selesai dan tidak ada rejection ── */}
      {mySlot?.status === "completed" && !hasAnyRejection && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>Pekerjaan selesai — Slot {mySlot.slotNumber} ✓</Text>
          {mySlot.beforePhotoUrl && (
            <View style={styles.completedPhotoRow}>
              <Text style={styles.completedPhotoLabel}>Foto Sebelum:</Text>
              <Image source={{ uri: resolveImageUrl(mySlot.beforePhotoUrl) }} style={styles.completedPhoto} resizeMode="cover" />
              {mySlot.beforeRemark ? <Text style={styles.completedRemark}>"{mySlot.beforeRemark}"</Text> : null}
            </View>
          )}
          {mySlot.afterPhotoUrl && (
            <View style={styles.completedPhotoRow}>
              <Text style={styles.completedPhotoLabel}>Foto Setelah:</Text>
              <Image source={{ uri: resolveImageUrl(mySlot.afterPhotoUrl) }} style={styles.completedPhoto} resizeMode="cover" />
              {mySlot.afterRemark ? <Text style={styles.completedRemark}>"{mySlot.afterRemark}"</Text> : null}
            </View>
          )}
          <Text style={styles.statusSubtext}>{getVerificationLabel(mySlot.verificationStatus)}</Text>
          {myPayout && (
            <Text style={styles.statusSubtext}>Komisi: {getPayoutStatusLabel(myPayout.status)}</Text>
          )}
          {myPayout?.status === "paid" && (
            <Text style={styles.statusPaid}>Bukti transfer sudah diunggah admin ✓</Text>
          )}
        </View>
      )}

      {openSlots === 0 && !mySlot && (
        <View style={styles.fullBanner}>
          <Text style={styles.fullText}>Semua slot sudah penuh</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoHighlight]}>{value}</Text>
    </View>
  );
}

function ProgressStep({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        <Text style={styles.stepDotText}>{done ? "✓" : "○"}</Text>
      </View>
      <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  id: { fontSize: 12, color: "#888", fontFamily: "monospace" },
  title: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a", marginTop: 4 },
  desc: { fontSize: 14, color: "#666", marginTop: 8, lineHeight: 20 },
  infoGrid: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 16, gap: 10, borderWidth: 1, borderColor: "#e8f5e9" },
  infoItem: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: "#888" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  infoHighlight: { color: "#2e7d32", fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 20, marginBottom: 10 },
  slotRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#eee" },
  slotMine: { borderColor: "#2e7d32", backgroundColor: "#f1f8f1" },
  slotNum: { fontWeight: "600", color: "#333" },
  slotStatus: { color: "#666", fontSize: 13 },
  slotProgress: { color: "#2e7d32", fontSize: 11, fontWeight: "600", marginTop: 2 },
  takeBtn: { backgroundColor: "#2e7d32", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  takeBtnDisabled: { opacity: 0.7 },
  takeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  progressSection: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: "#e8f5e9" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: "600", color: "#333" },
  progressPct: { fontSize: 13, fontWeight: "700", color: "#2e7d32" },
  progressBarBg: { height: 8, backgroundColor: "#e8f5e9", borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  progressBarFill: { height: "100%", backgroundColor: "#2e7d32", borderRadius: 4 },
  progressSteps: { flexDirection: "row", justifyContent: "space-between" },
  stepItem: { alignItems: "center", flex: 1 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#e0e0e0", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  stepDotDone: { backgroundColor: "#2e7d32" },
  stepDotText: { fontSize: 10, color: "#fff" },
  stepLabel: { fontSize: 10, color: "#999", textAlign: "center" },
  stepLabelDone: { color: "#2e7d32", fontWeight: "600" },
  // Rejection banner
  rejectionBanner: { backgroundColor: "#ffebee", borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: "#ef9a9a" },
  rejectionTitle: { fontSize: 14, fontWeight: "700", color: "#c62828", marginBottom: 4 },
  rejectionReason: { fontSize: 12, color: "#b71c1c", marginBottom: 8, lineHeight: 18 },
  rejectionTags: { gap: 6 },
  rejectionTag: { backgroundColor: "#fff", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#ef9a9a" },
  rejectionTagText: { fontSize: 12, color: "#c62828", fontWeight: "600" },
  // Rejected photo within card
  rejectedPhotoBanner: { backgroundColor: "#ffebee", borderRadius: 8, padding: 10, marginBottom: 10 },
  rejectedPhotoText: { fontSize: 12, color: "#c62828", fontWeight: "600", textAlign: "center" },
  // Photo cards
  photoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 14, borderWidth: 1, borderColor: "#e8f5e9" },
  photoCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  photoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  photoBadgeText: { fontSize: 10, fontWeight: "700" },
  photoCardTitle: { fontSize: 14, fontWeight: "700", color: "#333" },
  photoHint: { fontSize: 13, color: "#888", marginBottom: 10, lineHeight: 18 },
  remarkInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 13, color: "#333", backgroundColor: "#fafafa", marginBottom: 10, textAlignVertical: "top" },
  photoBtns: { flexDirection: "row", gap: 8 },
  photoBtn: { flex: 1, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  photoBtnOutline: { flex: 1, borderRadius: 8, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: "#2e7d32" },
  photoBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  photoBtnOutlineText: { color: "#2e7d32", fontWeight: "600", fontSize: 13 },
  photoBtnDisabled: { opacity: 0.5 },
  proofImage: { width: "100%", height: 180, borderRadius: 10, marginBottom: 8, backgroundColor: "#f0f0f0" },
  remarkDisplay: { backgroundColor: "#f9f9f9", borderRadius: 8, padding: 8, marginBottom: 6 },
  remarkLabel: { fontSize: 11, color: "#888", marginBottom: 2 },
  remarkText: { fontSize: 12, color: "#444", lineHeight: 18 },
  uploadedBadge: { backgroundColor: "#e8f5e9", borderRadius: 8, padding: 8, alignItems: "center" },
  uploadedText: { color: "#2e7d32", fontSize: 13, fontWeight: "600" },
  locationLoading: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, padding: 8, backgroundColor: "#fff8e1", borderRadius: 8 },
  locationLoadingText: { fontSize: 12, color: "#e65100" },
  // Completed
  completedBanner: { backgroundColor: "#e8f5e9", borderRadius: 12, padding: 16, marginTop: 16, alignItems: "center" },
  completedText: { color: "#2e7d32", fontWeight: "700", fontSize: 15, marginBottom: 12 },
  completedPhotoRow: { width: "100%", marginBottom: 12 },
  completedPhotoLabel: { fontSize: 12, color: "#666", fontWeight: "600", marginBottom: 4 },
  completedPhoto: { width: "100%", height: 140, borderRadius: 8, backgroundColor: "#f0f0f0" },
  completedRemark: { fontSize: 12, color: "#555", fontStyle: "italic", marginTop: 4 },
  statusSubtext: { color: "#555", fontSize: 13, marginTop: 6, textAlign: "center" },
  statusPaid: { color: "#1565c0", fontSize: 13, fontWeight: "600", marginTop: 4, textAlign: "center" },
  fullBanner: { backgroundColor: "#f5f5f5", borderRadius: 12, padding: 16, marginTop: 20, alignItems: "center" },
  fullText: { color: "#888" },
});
