import { NextResponse } from "next/server";
import { verifyMitraLogin } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email dan password wajib diisi" },
      { status: 400 }
    );
  }

  const mitra = await verifyMitraLogin(email, password);

  if (!mitra) {
    return NextResponse.json(
      { error: "Email atau password salah" },
      { status: 401 }
    );
  }

  if (mitra.status === "pending") {
    return NextResponse.json(
      { error: "Akun masih menunggu persetujuan admin" },
      { status: 403 }
    );
  }

  if (mitra.status === "suspended") {
    return NextResponse.json(
      { error: "Akun Anda di-suspend. Hubungi admin." },
      { status: 403 }
    );
  }

  return NextResponse.json({ mitra });
}
