import { supabase } from '../lib/supabase';

// Convert base64 public key to Uint8Array for Web Push
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Tarayıcınız bildirimleri desteklemiyor.');
  }

  // 1. Check and request permission
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  
  if (permission !== 'granted') {
    throw new Error('Bildirim izni reddedildi.');
  }

  // 2. Wait for Service Worker to be ready
  const registration = await navigator.serviceWorker.ready;

  // 3. Get Public Key from Environment Variables (Assuming you add it to .env)
  // For safety, fallback to the one we just generated if available, but it should be in Vite env.
  const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicVapidKey) {
    throw new Error('VAPID_PUBLIC_KEY ayarlanmamış.');
  }

  // 4. Subscribe the user
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  });

  const subData = JSON.parse(JSON.stringify(subscription));

  // 5. Save to Supabase
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Oturum açık değil.');

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: user.id,
    endpoint: subData.endpoint,
    auth: subData.keys.auth,
    p256dh: subData.keys.p256dh
  });

  if (error) {
    throw new Error('Abonelik veritabanına kaydedilemedi: ' + error.message);
  }

  return true;
}
