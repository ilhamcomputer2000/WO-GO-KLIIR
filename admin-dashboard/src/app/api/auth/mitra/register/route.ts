import { NextResponse } from "next/server";
import { registerMitra } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, email, password, phone, address,
      religion, birthPlace, birthDate, maritalStatus, gender,
      nik, bankName, bankAccountNumber, bankAccountName, ktpImageUrl,
    } = body as {
      name?: string; email?: string; password?: string; phone?: string;
      address?: string; religion?: string; birthPlace?: string; birthDate?: string;
      maritalStatus?: string; gender?: string; nik?: string;
      bankName?: string; bankAccountNumber?: string; bankAccountName?: string;
      ktpImageUrl?: string;
    };

    if (!name || !email || !password)
      return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });

    const result = await registerMitra({
      name, email, password,
      phone: phone ?? "",
      address: address ?? "",
      religion: religion ?? "",
      birthPlace: birthPlace ?? "",
      birthDate: birthDate ?? "",
      maritalStatus: maritalStatus ?? "",
      gender: gender ?? "",
      nik: nik ?? "",
      bankName: bankName ?? "",
      bankAccountNumber: bankAccountNumber ?? "",
      bankAccountName: bankAccountName ?? "",
      ktpImageUrl: ktpImageUrl ?? "",
    });

    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({
      message: "Pendaftaran berhasil! Akun Anda menunggu persetujuan admin.",
      mitra: result.mitra,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pendaftaran gagal" },
      { status: 500 }
    );
  }
}
