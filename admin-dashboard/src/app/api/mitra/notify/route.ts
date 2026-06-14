export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, email, name, reason } = body as {
      type: "approved" | "rejected";
      email: string;
      name: string;
      reason?: string;
    };

    if (!email || !name || !type) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;

    if (!resendKey) {
      // Log saja jika belum ada API key
      console.log(`[EMAIL NOTIF] To: ${email} | Type: ${type} | Reason: ${reason ?? "-"}`);
      return NextResponse.json({ message: "Email dicatat (Resend belum dikonfigurasi)", logged: true });
    }

    const subject = type === "approved"
      ? "✅ Pendaftaran Mitra GO KLIRR Disetujui!"
      : "❌ Pendaftaran Mitra GO KLIRR Ditolak";

    const html = type === "approved"
      ? `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="color:#2e7d32">Selamat, ${name}! 🎉</h2>
          <p>Pendaftaran akun mitra CSO Anda di <strong>GO KLIRR</strong> telah <strong>disetujui</strong>.</p>
          <p>Anda sekarang dapat login ke aplikasi GO KLIRR dan mulai mengambil Work Order yang tersedia.</p>
          <div style="background:#e8f5e9;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#1b5e20">📱 Buka aplikasi GO KLIRR dan login dengan email Anda untuk mulai bekerja.</p>
          </div>
          <p style="color:#888;font-size:12px">Email ini dikirim otomatis oleh sistem GO KLIRR.</p>
        </div>
      `
      : `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="color:#c62828">Halo, ${name}</h2>
          <p>Mohon maaf, pendaftaran akun mitra CSO Anda di <strong>GO KLIRR</strong> tidak dapat disetujui saat ini.</p>
          <div style="background:#ffebee;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #c62828">
            <p style="margin:0;font-weight:600;color:#c62828">Alasan:</p>
            <p style="margin:8px 0 0;color:#333">${reason ?? "Tidak memenuhi persyaratan pendaftaran."}</p>
          </div>
          <p>Anda dapat mendaftar ulang setelah melengkapi persyaratan yang diperlukan.</p>
          <p>Jika ada pertanyaan, hubungi kami di <a href="mailto:admin@goklirr.com">admin@goklirr.com</a></p>
          <p style="color:#888;font-size:12px">Email ini dikirim otomatis oleh sistem GO KLIRR.</p>
        </div>
      `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "GO KLIRR <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Resend error:", err);
      return NextResponse.json({ message: "Email gagal dikirim via Resend", error: err }, { status: 500 });
    }

    return NextResponse.json({ message: "Email berhasil dikirim" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal kirim email" },
      { status: 500 }
    );
  }
}
