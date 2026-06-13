import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { loginMitra } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const DEMO = { email: "budi@email.com", password: "mitra123" };

export default function LoginScreen() {
  const setMitra = useAuthStore((s) => s.setMitra);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { mitra } = await loginMitra(email, password);
      setMitra(mitra);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("../assets/logo-goklirr.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>GO KLIRR</Text>
        <Text style={styles.tagline}>Bersih Cepat, Hasil Tepat.</Text>
        <Text style={styles.subtitle}>Aplikasi CSO Mitra</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="budi@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
            }}
          >
            <Text style={styles.demoText}>Gunakan Akun Demo (Budi)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f7f0" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    alignItems: "center",
  },
  logo: { width: 160, height: 160, marginBottom: 8 },
  brand: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2e7d32",
    letterSpacing: 1,
  },
  tagline: { fontSize: 14, color: "#1976d2", marginTop: 4 },
  subtitle: { fontSize: 16, color: "#666", marginTop: 12, marginBottom: 24 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#2e7d32",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  demoBtn: { marginTop: 12, alignItems: "center" },
  demoText: { color: "#1976d2", fontSize: 13 },
  error: { color: "#d32f2f", marginBottom: 8, fontSize: 13 },
});
