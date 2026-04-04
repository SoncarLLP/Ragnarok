"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "ragnarok_push_prompted";

/**
 * Silently subscribes authenticated users to push notifications after login.
 * The permission prompt is shown once (never on first visit — only after login).
 * Manages the subscription lifecycle (register, update, keep alive).
 */
export default function PushNotificationManager() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC) return;

    attempted.current = true;

    // Small delay so the UI has settled before we ask for permission
    const timer = setTimeout(() => {
      requestAndSubscribe(VAPID_PUBLIC);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}

async function requestAndSubscribe(vapidPublicKey: string) {
  try {
    // Don't re-prompt if already denied
    if (Notification.permission === "denied") return;

    // Only prompt once per session; subsequent sessions auto-subscribe if already granted
    const alreadyPrompted = sessionStorage.getItem(STORAGE_KEY);
    if (Notification.permission === "default" && alreadyPrompted) return;

    // Request permission (or silently subscribe if already granted)
    const currentPermission = Notification.permission;
    let granted = currentPermission === "granted";
    if (currentPermission === "default") {
      sessionStorage.setItem(STORAGE_KEY, "1");
      const result = await Notification.requestPermission();
      granted = result === "granted";
    }

    if (!granted) return;

    // Register (or retrieve) the service worker
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Send subscription to server
    const sub = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
      }),
    });
  } catch (err) {
    // Non-critical — push notifications are optional
    console.debug("Push subscription error:", err);
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
