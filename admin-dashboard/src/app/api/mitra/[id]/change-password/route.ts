export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { changeMitraPassword } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword)
    return NextResponse.json(
      { error: "Password lama dan baru wajib diisi" },
      { status: 400 }
    );

  if (newPassword.length < 6)
    return NextResponse.json(
      { error: "Password baru minimal 6 karakter" },
      { status: 400 }
    );

  const result = await changeMitraPassword(id, currentPassword, newPassword);
  if (!result.success)
    return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ message: "Password berhasil diubah" });
}
