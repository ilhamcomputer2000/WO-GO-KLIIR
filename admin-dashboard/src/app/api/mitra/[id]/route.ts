export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { adminResetMitraPassword, deleteMitra, getMitraById, updateMitraProfile, updateMitraStatus } from "@/lib/store";
import type { MitraStatus } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mitra = await getMitraById(id);
  if (!mitra)
    return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ mitra });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Update status (admin)
  if (body.status) {
    const { status } = body as { status: MitraStatus };
    const result = await updateMitraStatus(id, status);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ mitra: result.mitra });
  }

  // Admin reset password
  if (body.newPassword) {
    const { newPassword } = body as { newPassword: string };
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }
    const result = await adminResetMitraPassword(id, newPassword);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ message: "Password berhasil diubah" });
  }

  // Update profile (admin or mitra)
  const {
    name, phone, address, email, nik, religion,
    birthPlace, birthDate, maritalStatus, gender,
    bankName, bankAccountNumber, bankAccountName,
  } = body as Record<string, string | undefined>;

  const hasUpdate = name || phone !== undefined || address !== undefined ||
    email || nik !== undefined || religion !== undefined ||
    birthPlace !== undefined || birthDate !== undefined ||
    maritalStatus !== undefined || gender !== undefined ||
    bankName !== undefined || bankAccountNumber !== undefined ||
    bankAccountName !== undefined;

  if (!hasUpdate)
    return NextResponse.json({ error: "Tidak ada data yang diupdate" }, { status: 400 });

  const result = await updateMitraProfile(id, {
    name, phone, address, email, nik, religion,
    birthPlace, birthDate, maritalStatus, gender,
    bankName, bankAccountNumber, bankAccountName,
  });
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ mitra: result.mitra });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteMitra(id);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ message: "Mitra dihapus" });
}
