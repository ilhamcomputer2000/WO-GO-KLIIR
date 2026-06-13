import { getWorkOrderById } from "@/lib/store";
import { getMitraPayouts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: woId } = await params;
  const { searchParams } = new URL(request.url);
  const mitraId = searchParams.get("mitraId");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        const msg = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(msg));
      };

      // Send initial data immediately
      const sendUpdate = async () => {
        try {
          const wo = await getWorkOrderById(woId);
          if (!wo) return;

          let payout = null;
          if (mitraId) {
            const payouts = await getMitraPayouts(mitraId);
            payout = payouts.find((p) => p.woId === woId) ?? null;
          }

          send({ workOrder: wo, payout });
        } catch {
          // ignore errors in stream
        }
      };

      await sendUpdate();

      // Push update every 5 seconds (balance between real-time and server load)
      const interval = setInterval(sendUpdate, 5000);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
