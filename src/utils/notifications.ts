/**
 * Push Notification yardımcı fonksiyonları.
 * Service Worker kurulduktan sonra uygulama içinden bildirim göndermek için kullanılır.
 * Not: Bu "local notification" — push server gerektirmez, uygulama açıkken çalışır.
 */

/**
 * Tarayıcıdan bildirim izni ister.
 * İzin zaten verilmişse tekrar sormaz.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('[Bildirim] Bu tarayıcı bildirimleri desteklemiyor.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return await Notification.requestPermission();
};

/**
 * Anlık yerel bildirim gönderir.
 * Uygulama açık olduğunda çalışır — Service Worker gerektirmez.
 */
export const sendLocalNotification = (
  title: string,
  body: string,
  options?: { icon?: string; tag?: string; silent?: boolean }
): boolean => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  new Notification(title, {
    body,
    icon: options?.icon ?? '/icons/pwa-icon.svg',
    tag: options?.tag,
    silent: options?.silent ?? false,
  });

  return true;
};

/**
 * Gecikmiş aşı sayısı için bildirim gönderir.
 */
export const notifyOverdueVaccines = (count: number): void => {
  if (count <= 0) return;
  sendLocalNotification(
    '💉 Aşı Uyarısı',
    `${count} hayvanın gecikmiş aşısı var. Sağlık yönetimine git.`,
    { tag: 'overdue-vaccines' }
  );
};

/**
 * Yaklaşan doğumlar için bildirim gönderir.
 */
export const notifyUpcomingBirths = (count: number): void => {
  if (count <= 0) return;
  sendLocalNotification(
    '🐄 Doğum Yaklaşıyor',
    `${count} hayvanın doğumu 7 gün içinde bekleniyor.`,
    { tag: 'upcoming-births' }
  );
};
