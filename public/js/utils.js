// utils.js
// Funções pequenas e reaproveitáveis, sem dependência de outros módulos.

/** Atalho pra document.querySelector */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

/** Atalho pra querySelectorAll, já retornando um array */
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Converte segundos totais em "MM:SS".
 * Ex: formatTime(65) -> "01:05"
 */
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Evita que um texto digitado pelo usuário (ex: "<script>") vire HTML
 * quando for inserido com innerHTML.
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
