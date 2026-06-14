import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { registerMitra, uploadKtpImage } from "@/lib/api";

type MaritalStatus = "Belum Kawin" | "Kawin" | "Cerai Hidup" | "Cerai Mati";
type Gender = "Laki-laki" | "Perempuan";
type Religion = "Islam" | "Kristen" | "Katolik" | "Hindu" | "Buddha" | "Konghucu";

const MARITAL_OPTIONS: MaritalStatus[] = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
const GENDER_OPTIONS: Gender[] = ["Laki-laki", "Perempuan"];
const RELIGION_OPTIONS: Religion[] = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"];

const BANK_OPTIONS = [
  "BCA (Bank Central Asia)",
  "Bank Mandiri",
  "BNI (Bank Negara Indonesia)",
  "BRI (Bank Rakyat Indonesia)",
  "BTN (Bank Tabungan Negara)",
  "CIMB Niaga",
  "Bank Danamon",
  "Permata Bank",
  "Maybank Indonesia",
  "Bank Mega",
  "OCBC NISP",
  "Bank Syariah Indonesia (BSI)",
  "Bank BCA Syariah",
  "Bank Muamalat",
  "Bank Panin",
  "HSBC Indonesia",
  "Citibank Indonesia",
  "Bank Commonwealth",
  "Jenius (BTPN)",
  "Bank Jago",
  "SeaBank",
  "Blu by BCA",
  "Lainnya",
];

export default function RegisterScreen() {
  const router = useRouter();

  // KTP
  const [ktpUri, setKtpUri] = useState<string | null>(null);
  const [nik, setNik] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [religion, setReligion] = useState<Religion | "">("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">("");
  const [gender, setGender] = useState<Gender | "">("");

  // Bank info
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [showBankPicker, setShowBankPicker] = useState(false);

  // Account
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1=KTP, 2=Account

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDay, setPickerDay] = useState(1);
  const [pickerMonth, setPickerMonth] = useState(1);
  const [pickerYear, setPickerYear] = useState(1990);

  // ── Upload KTP (foto saja, tanpa OCR) ──────────────────────
  const pickKTP = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses kamera/galeri.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });

    if (result.canceled || !result.assets[0]) return;
    setKtpUri(result.assets[0].uri);
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Nama, email, dan password wajib diisi");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      // Upload foto KTP ke server dulu jika ada
      let ktpUrl = "";
      if (ktpUri) {
        ktpUrl = await uploadKtpImage(ktpUri);
      }

      await registerMitra({
        name,
        email,
        password,
        phone,
        address,
        religion,
        birthPlace,
        birthDate,
        maritalStatus,
        gender,
        nik,
        bankName,
        bankAccountNumber,
        bankAccountName,
        ktpImageUrl: ktpUrl,
      });
      Alert.alert(
        "Pendaftaran Berhasil! 🎉",
        "Akun Anda sedang menunggu persetujuan admin. Kami akan menghubungi Anda segera.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (e) {
      Alert.alert("Gagal", e instanceof Error ? e.message : "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 1: KTP & Data Diri ───────────────────────────────
  const renderStep1 = () => (
    <>
      {/* Upload KTP */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Upload Foto KTP</Text>
        <Text style={styles.sectionDesc}>
          Upload foto KTP sebagai syarat pendaftaran mitra
        </Text>

        {ktpUri ? (
          <View>
            <Image source={{ uri: ktpUri }} style={styles.ktpPreview} resizeMode="contain" />
            <TouchableOpacity
              style={styles.reuploadBtn}
              onPress={() => setKtpUri(null)}
            >
              <Text style={styles.reuploadText}>Ganti Foto KTP</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ktpBtns}>
            <TouchableOpacity style={styles.ktpBtn} onPress={() => pickKTP(true)}>
              <Text style={styles.ktpBtnIcon}>📷</Text>
              <Text style={styles.ktpBtnText}>Ambil Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ktpBtn, styles.ktpBtnOutline]} onPress={() => pickKTP(false)}>
              <Text style={styles.ktpBtnIcon}>🖼</Text>
              <Text style={[styles.ktpBtnText, { color: "#2e7d32" }]}>Dari Galeri</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Data Diri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Data Diri</Text>

        <Field label="Nama Lengkap *">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Sesuai KTP"
            placeholderTextColor="#aaa"
          />
        </Field>

        <Field label="NIK KTP *">
          <TextInput
            style={styles.input}
            value={nik}
            onChangeText={(t) => setNik(t.replace(/\D/g, "").slice(0, 16))}
            placeholder="16 digit nomor KTP"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            maxLength={16}
          />
          {nik.length > 0 && nik.length < 16 && (
            <Text style={{ fontSize: 11, color: "#e65100", marginTop: 2 }}>
              NIK harus 16 digit ({nik.length}/16)
            </Text>
          )}
        </Field>

        <Field label="Jenis Kelamin *">
          <OptionPicker
            options={GENDER_OPTIONS}
            value={gender}
            onSelect={(v) => setGender(v as Gender)}
          />
        </Field>

        <Field label="Agama *">
          <OptionPicker
            options={RELIGION_OPTIONS}
            value={religion}
            onSelect={(v) => setReligion(v as Religion)}
          />
        </Field>

        <Field label="Tempat Lahir *">
          <TextInput
            style={styles.input}
            value={birthPlace}
            onChangeText={setBirthPlace}
            placeholder="Kota tempat lahir"
            placeholderTextColor="#aaa"
          />
        </Field>

        <Field label="Tanggal Lahir *">
          <TouchableOpacity
            style={[styles.input, styles.dateBtn]}
            onPress={() => {
              // Pre-fill picker from existing value DD-MM-YYYY
              if (birthDate && birthDate.length === 10) {
                const parts = birthDate.split("-");
                setPickerDay(parseInt(parts[0]) || 1);
                setPickerMonth(parseInt(parts[1]) || 1);
                setPickerYear(parseInt(parts[2]) || 1990);
              }
              setShowDatePicker(true);
            }}
          >
            <Text style={birthDate ? styles.dateBtnText : styles.dateBtnPlaceholder}>
              {birthDate || "Pilih tanggal lahir"}
            </Text>
            <Text style={styles.dateBtnIcon}>📅</Text>
          </TouchableOpacity>
        </Field>

        <Field label="Alamat sesuai KTP *">
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="Alamat lengkap sesuai KTP"
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Field>

        <Field label="Status Perkawinan *">
          <OptionPicker
            options={MARITAL_OPTIONS}
            value={maritalStatus}
            onSelect={(v) => setMaritalStatus(v as MaritalStatus)}
          />
        </Field>

        {/* Informasi Rekening Bank */}
        <View style={styles.bankDivider}>
          <Text style={styles.bankDividerText}>💳  Informasi Rekening Bank</Text>
        </View>

        <Field label="Nama Bank *">
          <TouchableOpacity
            style={[styles.input, styles.dateBtn]}
            onPress={() => setShowBankPicker(true)}
          >
            <Text style={bankName ? styles.dateBtnText : styles.dateBtnPlaceholder}>
              {bankName || "Pilih bank..."}
            </Text>
            <Text style={{ fontSize: 12, color: "#aaa" }}>▼</Text>
          </TouchableOpacity>
        </Field>

        <Field label="Nomor Rekening *">
          <TextInput
            style={styles.input}
            value={bankAccountNumber}
            onChangeText={(t) => setBankAccountNumber(t.replace(/\D/g, ""))}
            placeholder="Nomor rekening tanpa spasi"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
          />
        </Field>

        <Field label="Atas Nama *">
          <TextInput
            style={styles.input}
            value={bankAccountName}
            onChangeText={setBankAccountName}
            placeholder="Nama pemilik rekening"
            placeholderTextColor="#aaa"
            autoCapitalize="characters"
          />
        </Field>
      </View>

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={() => {
          if (!name) {
            Alert.alert("Error", "Nama lengkap wajib diisi");
            return;
          }
          setStep(2);
        }}
      >
        <Text style={styles.nextBtnText}>Lanjut ke Data Akun →</Text>
      </TouchableOpacity>
    </>
  );

  // ── STEP 2: Email, HP, Password ───────────────────────────
  const renderStep2 = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Data Akun</Text>

        <Field label="Email *">
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@contoh.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#aaa"
          />
        </Field>

        <Field label="Nomor HP">
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
            placeholderTextColor="#aaa"
          />
        </Field>

        <Field label="Password *">
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimal 6 karakter"
            placeholderTextColor="#aaa"
          />
        </Field>

        <Field label="Konfirmasi Password *">
          <TextInput
            style={[
              styles.input,
              confirmPassword && password !== confirmPassword && styles.inputError,
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Ulangi password"
            placeholderTextColor="#aaa"
          />
          {confirmPassword && password !== confirmPassword && (
            <Text style={styles.errorText}>Password tidak cocok</Text>
          )}
        </Field>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>
          ℹ️ Setelah mendaftar, akun Anda akan ditinjau admin sebelum bisa digunakan.
        </Text>
      </View>

      <View style={styles.stepBtns}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)}>
          <Text style={styles.backStepText}>← Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Daftar Sekarang</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // ── Date picker helpers ──────────────────────────────────
  const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth(pickerMonth, pickerYear) }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - i);

  const confirmDate = () => {
    const dd = String(pickerDay).padStart(2, "0");
    const mm = String(pickerMonth).padStart(2, "0");
    setBirthDate(`${dd}-${mm}-${pickerYear}`);
    setShowDatePicker(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Login</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daftar Mitra CSO</Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={styles.stepDotText}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={styles.stepDotText}>2</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Data Diri</Text>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Data Akun</Text>
        </View>

        {step === 1 ? renderStep1() : renderStep2()}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bank Picker Modal */}
      <Modal visible={showBankPicker} transparent animationType="slide" onRequestClose={() => setShowBankPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Pilih Bank</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {BANK_OPTIONS.map((bank) => (
                <TouchableOpacity
                  key={bank}
                  style={[styles.bankOption, bankName === bank && styles.bankOptionActive]}
                  onPress={() => { setBankName(bank); setShowBankPicker(false); }}
                >
                  <Text style={[styles.bankOptionText, bankName === bank && styles.bankOptionTextActive]}>
                    {bank}
                  </Text>
                  {bankName === bank && <Text style={{ color: "#2e7d32", fontWeight: "700" }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowBankPicker(false)}>
              <Text style={styles.modalCancelText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Pilih Tanggal Lahir</Text>

            <View style={styles.pickerRow}>
              {/* Day */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Hari</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {days.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.pickerItem, pickerDay === d && styles.pickerItemActive]}
                      onPress={() => setPickerDay(d)}
                    >
                      <Text style={[styles.pickerItemText, pickerDay === d && styles.pickerItemTextActive]}>
                        {String(d).padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>Bulan</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {months.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.pickerItem, pickerMonth === m && styles.pickerItemActive]}
                      onPress={() => setPickerMonth(m)}
                    >
                      <Text style={[styles.pickerItemText, pickerMonth === m && styles.pickerItemTextActive]}>
                        {MONTHS[m - 1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year */}
              <View style={[styles.pickerCol, { flex: 1.4 }]}>
                <Text style={styles.pickerLabel}>Tahun</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {years.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.pickerItem, pickerYear === y && styles.pickerItemActive]}
                      onPress={() => setPickerYear(y)}
                    >
                      <Text style={[styles.pickerItemText, pickerYear === y && styles.pickerItemTextActive]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmDate}>
                <Text style={styles.modalConfirmText}>Pilih</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function OptionPicker({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionBtn, value === opt && styles.optionBtnActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.optionText, value === opt && styles.optionTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f9f5" },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#e8f5e9",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: "#2e7d32", fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },

  // Step indicator
  stepIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, paddingHorizontal: 60 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#ddd", alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: "#2e7d32" },
  stepDotText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  stepLine: { flex: 1, height: 2, backgroundColor: "#ddd", marginHorizontal: 8 },
  stepLineActive: { backgroundColor: "#2e7d32" },
  stepLabels: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 40, marginTop: 6, marginBottom: 4 },
  stepLabel: { fontSize: 12, color: "#aaa" },
  stepLabelActive: { color: "#2e7d32", fontWeight: "700" },

  // Section
  section: { backgroundColor: "#fff", borderRadius: 12, margin: 16, marginBottom: 8, padding: 16, borderWidth: 1, borderColor: "#e8f5e9" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: "#888", marginBottom: 14, lineHeight: 18 },

  // KTP
  ktpPreview: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#f0f0f0", marginBottom: 10 },
  ktpBtns: { flexDirection: "row", gap: 10 },
  ktpBtn: { flex: 1, backgroundColor: "#2e7d32", borderRadius: 10, paddingVertical: 16, alignItems: "center" },
  ktpBtnOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#2e7d32" },
  ktpBtnIcon: { fontSize: 24, marginBottom: 4 },
  ktpBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  reuploadBtn: { backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, alignItems: "center" },
  reuploadText: { color: "#666", fontSize: 13 },

  // Fields
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, fontSize: 14, color: "#1a1a1a", backgroundColor: "#fafafa", marginBottom: 2 },
  inputMultiline: { height: 80, textAlignVertical: "top" },
  inputError: { borderColor: "#c62828" },
  errorText: { fontSize: 12, color: "#c62828", marginTop: 2, marginBottom: 4 },

  // Option picker
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  optionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa" },
  optionBtnActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  optionText: { fontSize: 12, color: "#666" },
  optionTextActive: { color: "#fff", fontWeight: "600" },

  // Navigation buttons
  nextBtn: { backgroundColor: "#2e7d32", borderRadius: 12, margin: 16, padding: 15, alignItems: "center" },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  stepBtns: { flexDirection: "row", gap: 10, margin: 16 },
  backStepBtn: { flex: 1, borderRadius: 12, padding: 15, alignItems: "center", borderWidth: 1, borderColor: "#2e7d32" },
  backStepText: { color: "#2e7d32", fontWeight: "700", fontSize: 15 },
  submitBtn: { flex: 2, backgroundColor: "#2e7d32", borderRadius: 12, padding: 15, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.6 },

  infoBox: { backgroundColor: "#e8f5e9", borderRadius: 10, margin: 16, marginTop: 0, padding: 12 },
  infoBoxText: { fontSize: 13, color: "#2e7d32", lineHeight: 18 },

  // Date button
  dateBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  dateBtnText: { fontSize: 14, color: "#1a1a1a" },
  dateBtnPlaceholder: { fontSize: 14, color: "#aaa" },
  dateBtnIcon: { fontSize: 18 },

  // Bank section
  bankDivider: { marginTop: 16, marginBottom: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  bankDividerText: { fontSize: 13, fontWeight: "700", color: "#555" },
  bankOption: { paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bankOptionActive: { backgroundColor: "#f1f8f1" },
  bankOptionText: { fontSize: 14, color: "#333" },
  bankOptionTextActive: { color: "#2e7d32", fontWeight: "600" },

  // Date picker modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 16, textAlign: "center" },
  pickerRow: { flexDirection: "row", gap: 8, height: 200 },
  pickerCol: { flex: 1 },
  pickerLabel: { fontSize: 11, fontWeight: "700", color: "#888", textAlign: "center", marginBottom: 6 },
  pickerScroll: { flex: 1, borderWidth: 1, borderColor: "#eee", borderRadius: 8 },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f5f5f5" },
  pickerItemActive: { backgroundColor: "#e8f5e9" },
  pickerItemText: { fontSize: 14, color: "#666" },
  pickerItemTextActive: { color: "#2e7d32", fontWeight: "700" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalCancel: { flex: 1, borderRadius: 10, padding: 13, alignItems: "center", borderWidth: 1, borderColor: "#ddd" },
  modalCancelText: { color: "#666", fontWeight: "600" },
  modalConfirm: { flex: 1, borderRadius: 10, padding: 13, alignItems: "center", backgroundColor: "#2e7d32" },
  modalConfirmText: { color: "#fff", fontWeight: "700" },
});
