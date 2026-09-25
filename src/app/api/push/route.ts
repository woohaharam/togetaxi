import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

type Payload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  subscriptions: { endpoint: string; p256dh: string; auth: string }[];
};

// DB 트리거(private.notify_push)가 새 메시지마다 호출한다.
export async function POST(request: Request) {
  const secret = process.env.PUSH_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!secret || !publicKey || !privateKey) {
    return Response.json({ error: "push not configured" }, { status: 503 });
  }
  if (request.headers.get("x-push-secret") !== secret) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { title, body, url, tag, subscriptions } = (await request.json()) as Payload;
  webpush.setVapidDetails(SITE.url, publicKey, privateKey);
  const message = JSON.stringify({ title, body, url, tag });

  const results = await Promise.allSettled(
    subscriptions.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, {
        TTL: 60 * 60,
        urgency: "high",
        topic: tag.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, ""),
      }),
    ),
  );

  // 앱을 지웠거나 알림을 끈 기기는 구독을 정리한다
  const gone = subscriptions
    .filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number }).statusCode ?? 0);
    })
    .map((s) => s.endpoint);

  if (gone.length) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await supabase.rpc("prune_push_subscriptions", { p_secret: secret, p_endpoints: gone });
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return Response.json({ sent, failed: results.length - sent, pruned: gone.length });
}
