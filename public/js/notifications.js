// notifications.js
// Única responsabilidade: lidar com a Notification API do navegador.

/**
 * Pede permissão de notificação. Precisa partir de uma ação do usuário
 * (ex: clique no "Iniciar"), senão o navegador bloqueia o pedido.
 */
export function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/** Dispara uma notificação, se permitida. Se não, falha em silêncio. */
export function sendNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, { body });
}
