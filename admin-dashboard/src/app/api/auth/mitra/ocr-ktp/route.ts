import { NextResponse } from "next/server";

interface KTPData {
  name?: string;
  religion?: string;
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  maritalStatus?: string;
  gender?: string;
}

/**
 * Parse raw OCR text from KTP into structured data.
 * KTP Indonesia format:
 *   NIK: xxxxx
 *   Nama: BUDI SANTOSO
 *   Tempat/Tgl Lahir: JAKARTA, 01-01-1990
 *   Jenis Kelamin: LAKI-LAKI
 *   Agama: ISLAM
 *   Status Perkawinan: BELUM KAWIN
 *   Alamat: JL. CONTOH NO. 1
 */
function parseKTPText(text: string): KTPData {
  const result: KTPData = {};
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Nama
    if (lower.startsWith("nama") && !result.name) {
      const val = line.replace(/^nama\s*[:.]?\s*/i, "").trim();
      if (val) result.name = toTitleCase(val);
    }

    // Tempat/Tgl Lahir
    if ((lower.includes("tempat") || lower.includes("lahir")) && !result.birthPlace) {
      const val = line.replace(/^tempat.*lahir\s*[:.]?\s*/i, "").trim();
      const parts = val.split(",");
      if (parts.length >= 2) {
        result.birthPlace = toTitleCase(parts[0].trim());
        result.birthDate = parts[1].trim().replace(/\s+/g, "-");
      } else if (val) {
        result.birthPlace = toTitleCase(val);
      }
    }

    // Jenis Kelamin
    if (lower.includes("kelamin") && !result.gender) {
      const val = line.replace(/^jenis\s*kelamin\s*[:.]?\s*/i, "").trim().toLowerCase();
      if (val.includes("perempuan") || val.includes("wanita")) {
        result.gender = "Perempuan";
      } else if (val.includes("laki")) {
        result.gender = "Laki-laki";
      }
    }

    // Agama
    if (lower.startsWith("agama") && !result.religion) {
      const val = line.replace(/^agama\s*[:.]?\s*/i, "").trim().toLowerCase();
      if (val.includes("islam")) result.religion = "Islam";
      else if (val.includes("kristen") && !val.includes("katolik")) result.religion = "Kristen";
      else if (val.includes("katolik")) result.religion = "Katolik";
      else if (val.includes("hindu")) result.religion = "Hindu";
      else if (val.includes("buddha") || val.includes("budha")) result.religion = "Buddha";
      else if (val.includes("konghucu") || val.includes("khonghucu")) result.religion = "Konghucu";
    }

    // Status Perkawinan
    if ((lower.includes("kawin") || lower.includes("perkawinan")) && !result.maritalStatus) {
      const val = line.replace(/^status\s*perkawinan\s*[:.]?\s*/i, "").trim().toLowerCase();
      if (val.includes("belum")) result.maritalStatus = "Belum Kawin";
      else if (val.includes("cerai hidup")) result.maritalStatus = "Cerai Hidup";
      else if (val.includes("cerai mati")) result.maritalStatus = "Cerai Mati";
      else if (val.includes("kawin")) result.maritalStatus = "Kawin";
    }

    // Alamat
    if (lower.startsWith("alamat") && !result.address) {
      const val = line.replace(/^alamat\s*[:.]?\s*/i, "").trim();
      if (val) result.address = val;
    }
  }

  return result;
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { base64 } = body as { base64?: string };

    if (!base64) {
      return NextResponse.json({ error: "base64 wajib diisi" }, { status: 400 });
    }

    // Try Google Cloud Vision API if key is available
    const visionKey = process.env.GOOGLE_VISION_API_KEY;
    let ocrText = "";

    if (visionKey) {
      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64 },
                features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
              },
            ],
          }),
        }
      );
      const visionData = await visionRes.json();
      ocrText =
        visionData?.responses?.[0]?.fullTextAnnotation?.text ??
        visionData?.responses?.[0]?.textAnnotations?.[0]?.description ??
        "";
    }

    if (!ocrText) {
      // Fallback: return empty data so user fills manually
      return NextResponse.json({
        success: false,
        message: "OCR tidak tersedia — silakan isi data manual",
        data: {},
      });
    }

    const parsed = parseKTPText(ocrText);

    return NextResponse.json({
      success: true,
      rawText: ocrText,
      ...parsed,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "OCR gagal" },
      { status: 500 }
    );
  }
}
