/**
 * Server-side push notification utility.
 * Uses the web-push library with VAPID authentication.
 */
import webpush from "web-push";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL   = process.env.VAPID_EMAIL ?? "mailto:hello@soncar.co.uk";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Sends a push notification to a single subscription.
 * Returns true on success, false if subscription is expired/invalid (caller should delete it).
 */
export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<{ success: boolean; expired: boolean }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn("VAPID keys not configured — push notification skipped");
    return { success: false, expired: false };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? "/icons/icon-192x192.png",
        badge: payload.badge ?? "/icons/icon-72x72.png",
        url: payload.url ?? "/",
        tag: payload.tag,
        data: payload.data,
      })
    );
    return { success: true, expired: false };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired or invalid
      return { success: false, expired: true };
    }
    console.error("Push send error:", err);
    return { success: false, expired: false };
  }
}

/**
 * Sends a push notification to multiple subscriptions.
 * Returns the list of expired endpoint URLs that should be deleted.
 */
export async function sendToSubscriptions(
  subscriptions: (PushSubscriptionRecord & { id: string })[],
  payload: PushPayload
): Promise<string[]> {
  const expiredIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const { expired } = await sendPushNotification(sub, payload);
      if (expired) expiredIds.push(sub.id);
    })
  );

  return expiredIds;
}

export const PUSH_EVENTS = {
  REACTION:          "reaction",
  MENTION:           "mention",
  MESSAGE:           "message",
  WORKOUT_REMINDER:  "workout_reminder",
  NUTRITION_REMINDER:"nutrition_reminder",
  LEVEL_UP:          "level_up",
  CHALLENGE:         "challenge",
  WARNING:           "warning",
} as const;

export type PushEvent = (typeof PUSH_EVENTS)[keyof typeof PUSH_EVENTS];
