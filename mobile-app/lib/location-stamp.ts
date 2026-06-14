import * as Location from "expo-location";

export interface LocationStamp {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string;
  timestamp: string; // formatted datetime
}

/**
 * Minta izin lokasi, ambil koordinat, lalu reverse geocode ke alamat lengkap.
 * Timeout 10 detik — kalau gagal tetap lanjut upload tanpa stamp.
 */
export async function getLocationStamp(): Promise<LocationStamp | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 0,
      distanceInterval: 0,
    });

    const { latitude, longitude, accuracy } = loc.coords;

    // Reverse geocode
    let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const r = results[0];
        const parts = [
          r.name,
          r.street,
          r.district,
          r.subregion,
          r.city,
          r.region,
          r.postalCode,
          r.country,
        ].filter(Boolean);
        if (parts.length > 0) address = parts.join(", ");
      }
    } catch {
      // fallback ke koordinat saja
    }

    const now = new Date();
    const timestamp = now.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });

    return { latitude, longitude, accuracy, address, timestamp };
  } catch {
    return null;
  }
}

/**
 * Format stamp untuk dikirim ke backend (disimpan sebagai bagian remark).
 */
export function formatStampText(stamp: LocationStamp): string {
  return (
    `📍 ${stamp.address}\n` +
    `🌐 ${stamp.latitude.toFixed(6)}, ${stamp.longitude.toFixed(6)}` +
    (stamp.accuracy ? ` (±${Math.round(stamp.accuracy)}m)` : "") +
    `\n🕐 ${stamp.timestamp}`
  );
}
