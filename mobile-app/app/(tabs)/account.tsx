"use client";
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { updateMitraProfile, changeMitraPassword, uploadProfilePhoto } from "@/lib/api";
import { API_URL } from "@/constants/config";
import { formatDate } from "@/lib/utils";
import { fetchMyWorkOrders } from "@/lib/api";
import type { WorkOrder } from "@/types";
import { WOCard } from "@/components/WOCard";
import { ScreenHeader } from "@/components/ScreenHeader";

type Section = "main" | "edit-profile" | "change-password" | "detail-akun" | "wo-saya";

export default function AccountScreen() {
  const router = useRouter();
  const mitra = useAuthStore((s) => s.mitra);
  const updateMitraStore = useAuthStore((s) => s.updateMitra);
  const logout = useAuthStore((s) => s.logout);

  const [section, setSection] = useState<Section>("main");
  const [loading, setLoading] = useState(false);
  const [fullMitra, setFullMitra] = useState<Record<string, string> | null>(null);
  const [myWorkOrders, setMyWorkOrders] = useState<WorkOrder[]>([]);
  const [woLoading, setWoLoading] = useState(false);
  const [woRefreshing, setWoRefreshing] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Fetch full mitra data when opening detail
  const openDetail = async () => {
    setSection("detail-akun");
    if (!mitra || fullMitra) return;
    try {
      const res = await fetch(`${API_URL}/api/mitra/${mitra.id}`);
      const data = await res.json();
      if (data.mitra) setFullMitra(data.mitra as Record<string, string>);
    } catch { /* silent */ }
  };

  // Fetch my work orders
  const loadMyWork = async (silent = false) => {
    if (!mitra) return;
    if (!silent) setWoLoading(true);
    try {
      const res = await fetchMyWorkOrders(mitra.id);
      setMyWorkOrders(res.workOrders);
    } catch {
      /* silent */
    } finally {
      setWoLoading(false);
      setWoRefreshing(false);
    }
  };

  // Upload foto profil
  const handlePickProfilePhoto = async () => {
    Alert.alert("Foto Profil", "Pilih sumber foto", [
      {
        text: "Ambil Foto",
        onPress: () => pickProfilePhoto(true),
      },
      {
        text: "Dari Galeri",
        onPress: () => pickProfilePhoto(false),
      },
      { text: "Batal", style: "cancel" },
    ]);
  };

  const pickProfilePhoto = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses kamera/galeri.");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;

    if (!mitra) return;
    setPhotoUploading(true);
    try {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? "image/jpeg";
      const res = await uploadProfilePhoto(mitra.id, asset.uri, mimeType);
      updateMitraStore(res.mitra);
      Alert.alert("Berhasil", "Foto profil berhasil diperbarui");
    } catch (e) {
      Alert.alert("Gagal", e instanceof Error ? e.message : "Gagal upload foto profil");
    } finally {
      setPhotoUploading(false);
    }
  };

  const openMyWork = () => {
    setSection("wo-saya");
    loadMyWork();
  };

  const [name, setName] = useState(mitra?.name ?? "");
  const [phone, setPhone] = useState(mitra?.phone ?? "");
  const [address, setAddress] = useState(mitra?.address ?? "");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleLogout = () => {
    Alert.alert("Keluar", "Yakin ingin keluar dari akun?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: () => { logout(); router.replace("/login"); },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!mitra) return;
    if (!name.trim()) { Alert.alert("Error", "Nama tidak boleh kosong"); return; }
    setLoading(true);
    try {
      const res = await updateMitraProfile(mitra.id, {
        name: name.trim(), phone: phone.trim(), address: address.trim() || undefined,
      });
      updateMitraStore(res.mitra);
      Alert.alert("Berhasil", "Profil berhasil diperbarui");
      setSection("main");
    } catch (e) {
      Alert.alert("Gagal", e instanceof Error ? e.message : "Gagal memperbarui profil");
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!mitra) return;
    if (!currentPw || !newPw || !confirmPw) { Alert.alert("Error", "Semua field wajib diisi"); return; }
    if (newPw.length < 6) { Alert.alert("Error", "Password baru minimal 6 karakter"); return; }
    if (newPw !== confirmPw) { Alert.alert("Error", "Konfirmasi password tidak cocok"); return; }
    setLoading(true);
    try {
      await changeMitraPassword(mitra.id, currentPw, newPw);
      Alert.alert("Berhasil", "Password berhasil diubah");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setSection("main");
    } catch (e) {
      Alert.alert("Gagal", e instanceof Error ? e.message : "Gagal mengubah password");
    } finally { setLoading(false); }
  };

  const statusColor = (s?: string) => s === "active" ? "#2e7d32" : s === "suspended" ? "#c62828" : "#e65100";
  const statusLabel = (s?: string) => s === "active" ? "Aktif" : s === "suspended" ? "Disuspend" : "Menunggu Aktivasi";

  if (!mitra) return null;

  // ── Detail Akun ──
  if (section === "detail-akun") {
    const ext = (fullMitra ?? mitra) as unknown as Record<string, string>;
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection("main")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#2e7d32" />
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Detail Akun</Text>
        </View>

        {/* Info Akun */}
        <Text style={styles.groupLabel}>INFORMASI AKUN</Text>
        <View style={[styles.section, { marginTop: 0 }]}>
          <View style={styles.detailBody}>
            <DetailRow icon="mail-outline" label="Email" value={mitra.email} />
            <DetailRow icon="call-outline" label="No. HP" value={mitra.phone || "—"} />
            <DetailRow icon="location-outline" label="Alamat" value={mitra.address || "—"} />
            <DetailRow icon="calendar-outline" label="Bergabung" value={mitra.registeredAt ? formatDate(mitra.registeredAt) : "—"} />
            <DetailRow icon="checkmark-circle-outline" label="WO Selesai" value={String(mitra.completedWO)} />
            <DetailRow icon="cash-outline" label="Total Komisi" value={`Rp ${mitra.totalCommission.toLocaleString("id-ID")}`} highlight last />
          </View>
        </View>

        {/* Data Pribadi */}
        <Text style={styles.groupLabel}>DATA PRIBADI (KTP)</Text>
        <View style={[styles.section, { marginTop: 0 }]}>
          <View style={styles.detailBody}>
            <DetailRow icon="card-outline" label="NIK" value={ext.nik || "—"} />
            <DetailRow icon="person-outline" label="Jenis Kelamin" value={ext.gender || "—"} />
            <DetailRow icon="moon-outline" label="Agama" value={ext.religion || "—"} />
            <DetailRow icon="navigate-outline" label="Tempat Lahir" value={ext.birthPlace || "—"} />
            <DetailRow icon="calendar-number-outline" label="Tgl Lahir" value={ext.birthDate || "—"} />
            <DetailRow icon="heart-outline" label="Status Kawin" value={ext.maritalStatus || "—"} last />
          </View>
        </View>

        {/* Info Bank */}
        {(ext.bankName || ext.bankAccountNumber) && (
          <>
            <Text style={styles.groupLabel}>REKENING BANK</Text>
            <View style={[styles.section, { marginTop: 0 }]}>
              <View style={styles.detailBody}>
                <DetailRow icon="business-outline" label="Nama Bank" value={ext.bankName || "—"} />
                <DetailRow icon="card-outline" label="No. Rekening" value={ext.bankAccountNumber || "—"} />
                <DetailRow icon="person-circle-outline" label="Atas Nama" value={ext.bankAccountName || "—"} last />
              </View>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  // ── Edit Profile ──
  if (section === "edit-profile") {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection("main")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#2e7d32" />
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Ubah Profil</Text>
        </View>
        <View style={styles.formCard}>
          <FormField label="Nama Lengkap">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama lengkap" placeholderTextColor="#bbb" />
          </FormField>
          <FormField label="Nomor HP">
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" placeholderTextColor="#bbb" />
          </FormField>
          <FormField label="Alamat">
            <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} value={address} onChangeText={setAddress} placeholder="Alamat lengkap" multiline placeholderTextColor="#bbb" />
          </FormField>
          <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handleSaveProfile} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Simpan Perubahan</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Change Password ──
  if (section === "change-password") {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection("main")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#2e7d32" />
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Ganti Kata Sandi</Text>
        </View>
        <View style={styles.formCard}>
          <FormField label="Password Lama">
            <View style={styles.pwRow}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={currentPw} onChangeText={setCurrentPw} secureTextEntry={!showPw} placeholder="Password saat ini" placeholderTextColor="#bbb" />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 10 }}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color="#888" />
              </TouchableOpacity>
            </View>
          </FormField>
          <FormField label="Password Baru">
            <TextInput style={styles.input} value={newPw} onChangeText={setNewPw} secureTextEntry={!showPw} placeholder="Minimal 6 karakter" placeholderTextColor="#bbb" />
          </FormField>
          <FormField label="Konfirmasi Password Baru">
            <TextInput style={[styles.input, confirmPw && newPw !== confirmPw && styles.inputError]} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry={!showPw} placeholder="Ulangi password" placeholderTextColor="#bbb" />
            {confirmPw && newPw !== confirmPw && <Text style={styles.errorText}>Password tidak cocok</Text>}
          </FormField>
          <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={handleChangePassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Ubah Password</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── WO Saya ──
  if (section === "wo-saya") {
    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSection("main")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#2e7d32" />
            <Text style={styles.backText}>Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>WO Saya</Text>
        </View>

        {woLoading ? (
          <View style={styles.woLoadingWrap}>
            <ActivityIndicator size="large" color="#2e7d32" />
            <Text style={styles.woLoadingText}>Memuat pekerjaan...</Text>
          </View>
        ) : (
          <FlatList
            data={myWorkOrders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <WOCard wo={item} mitraId={mitra?.id} />}
            refreshControl={
              <RefreshControl
                refreshing={woRefreshing}
                onRefresh={() => {
                  setWoRefreshing(true);
                  loadMyWork(true);
                }}
                colors={["#2e7d32"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.woEmptyWrap}>
                <View style={styles.woEmptyIconWrap}>
                  <Ionicons name="search-outline" size={40} color="#ccc" />
                </View>
                <Text style={styles.woEmptyTitle}>Belum ada WO diambil</Text>
                <Text style={styles.woEmptyDesc}>
                  Buka tab WO Tersedia untuk ambil slot pekerjaan.
                </Text>
              </View>
            }
            contentContainerStyle={
              myWorkOrders.length === 0 ? styles.woEmptyContainer : styles.woListContent
            }
          />
        )}
      </View>
    );
  }

  // ── Main ──
  return (
    <View style={styles.container}>
      <ScreenHeader title="Akun" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero with green bg */}
        <View style={styles.heroBg}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handlePickProfilePhoto}
            activeOpacity={0.85}
            disabled={photoUploading}
          >
            {photoUploading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (mitra as unknown as Record<string, string>).profilePhotoUrl ? (
              <Image
                source={{ uri: (mitra as unknown as Record<string, string>).profilePhotoUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitial}>{mitra.name.charAt(0).toUpperCase()}</Text>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{mitra.name}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor(mitra.status) + "18" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(mitra.status) }]} />
            <Text style={[styles.statusPillText, { color: statusColor(mitra.status) }]}>
              {statusLabel(mitra.status)}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Pekerjaan</Text>
            <Text style={styles.statValue}>{mitra.completedWO}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rating Mitra</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[styles.statValue, { color: "#2e7d32" }]}>4.9</Text>
              <Ionicons name="star" size={16} color="#2e7d32" />
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <MenuRow iosIcon="id-card-outline" androidIcon="id-card-outline" label="Detail Akun" desc="Email, HP, alamat, dan komisi" onPress={openDetail} />
          <View style={styles.rowDivider} />
          <MenuRow iosIcon="briefcase-outline" androidIcon="briefcase-outline" label="WO Saya" desc="Lihat pekerjaan yang sedang diambil" onPress={openMyWork} />
          <View style={styles.rowDivider} />
          <MenuRow iosIcon="create-outline" androidIcon="create-outline" label="Ubah Profil" desc="Nama, nomor HP, dan alamat" onPress={() => { setName(mitra.name); setPhone(mitra.phone ?? ""); setAddress(mitra.address ?? ""); setSection("edit-profile"); }} />
          <View style={styles.rowDivider} />
          <MenuRow iosIcon="lock-closed-outline" androidIcon="lock-closed-outline" label="Ganti Kata Sandi" desc="Perbarui password akun" onPress={() => { setCurrentPw(""); setNewPw(""); setConfirmPw(""); setSection("change-password"); }} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#c62828" />
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>
        <Text style={styles.version}>GO KLIRR CSO Mitra v1.0</Text>
      </ScrollView>
    </View>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function DetailRow({ icon, label, value, highlight, last }: {
  icon: string; label: string; value: string; highlight?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={15}
        color="#aaa"
        style={{ marginRight: 8, marginTop: 1 }}
      />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && { color: "#2e7d32" }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function MenuRow({ iosIcon, androidIcon, label, desc, onPress }: {
  iosIcon: string; androidIcon: string; label: string; desc: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={iosIcon as keyof typeof Ionicons.glyphMap} size={20} color="#2e7d32" />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f4" },

  // Sub-page header
  subHeader: {
    backgroundColor: "#fff",
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 2, marginRight: 8 },
  backText: { color: "#2e7d32", fontSize: 14, fontWeight: "600" },
  subHeaderTitle: { fontSize: 17, fontWeight: "700", color: "#111" },

  // Hero
  heroBg: {
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 50,
  },
  heroInfo: {
    alignItems: "center",
    marginTop: -28,
    paddingBottom: 16,
    backgroundColor: "#f4f7f4",
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#2e7d32",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 36, fontWeight: "800", color: "#fff" },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#1b5e20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  heroName: { fontSize: 19, fontWeight: "800", color: "#111", marginTop: 10 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: "600" },

  // Stats
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eef3ee",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: "#eef3ee" },
  statLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },

  // Section card
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eef3ee",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111" },

  // Detail rows
  detailBody: { borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  detailLabel: { fontSize: 13, color: "#999", flex: 1, marginTop: 1 },
  detailValue: { fontSize: 13, fontWeight: "600", color: "#222", flex: 2, textAlign: "right" },

  // Menu rows
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "700", color: "#111" },
  menuDesc: { fontSize: 12, color: "#999", marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: "#f5f5f5", marginLeft: 66 },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  logoutText: { color: "#c62828", fontSize: 14, fontWeight: "700" },
  version: { textAlign: "center", color: "#ccc", fontSize: 11, marginTop: 12, marginBottom: 36 },

  groupLabel: { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.8, marginTop: 20, marginHorizontal: 20, marginBottom: 8 },

  // Form
  formCard: { backgroundColor: "#fff", borderRadius: 16, margin: 16, padding: 16, borderWidth: 1, borderColor: "#eef3ee" },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 12, fontSize: 14, color: "#111", backgroundColor: "#fafafa", marginBottom: 2 },
  inputError: { borderColor: "#c62828" },
  errorText: { fontSize: 12, color: "#c62828", marginBottom: 6 },
  pwRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  primaryBtn: { backgroundColor: "#2e7d32", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.6 },

  // WO Saya
  woLoadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80 },
  woLoadingText: { color: "#888", fontSize: 13, marginTop: 12 },
  woListContent: { padding: 16 },
  woEmptyContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
  woEmptyWrap: { alignItems: "center" },
  woEmptyIconWrap: { marginBottom: 16, width: 72, height: 72, borderRadius: 36, backgroundColor: "#f0f4f0", alignItems: "center", justifyContent: "center" },
  woEmptyTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  woEmptyDesc: { color: "#888", textAlign: "center", lineHeight: 20 },
});
