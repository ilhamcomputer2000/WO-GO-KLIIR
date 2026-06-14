import { Platform } from "react-native";

function getDefaultApiUrl() {
  // Ganti dengan URL website Vercel Anda yang baru saja online
  return "https://wo-go-kliir.vercel.app";
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? getDefaultApiUrl();
