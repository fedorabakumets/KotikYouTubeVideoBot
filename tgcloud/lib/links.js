/** @fileoverview Проверка ссылок YouTube и Shorts без переходов на сторонние адреса. */

/**
 * Получает идентификатор публичного ролика из разрешённой ссылки.
 * @param {string} value - Исходная ссылка.
 * @returns {string|null} Идентификатор видео либо отказ.
 */
export function youtubeId(value) {
  const match = String(value || '').match(/^https?:\/\/([^/?#]+)(\/[^#]*)?(?:#.*)?$/i);
  if (!match) return null;
  const host = match[1].toLowerCase(), path = match[2] || '/';
  let id;
  if (host === 'youtu.be') id = path.match(/^\/([\w-]{11})(?:[/?]|$)/)?.[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    id = path.match(/^\/(?:shorts|embed|live)\/([\w-]{11})(?:[/?]|$)/)?.[1];
    if (!id && path.startsWith('/watch?')) id = path.match(/[?&]v=([\w-]{11})(?:&|$)/)?.[1];
  }
  return id || null;
}

/**
 * Находит ссылку в тексте или скрытой ссылке сообщения Telegram.
 * @param {object} message - Сообщение пользователя.
 * @returns {string|null} Проверенный идентификатор видео.
 */
export function messageVideoId(message) {
  const text = message.text || message.caption || '';
  const candidates = [...(text.match(/https?:\/\/[^\s<>]+/gi) || []),
    ...(message.entities || message.caption_entities || []).map(entity => entity.url).filter(Boolean)];
  for (const candidate of candidates) {
    const id = youtubeId(candidate.replace(/[),.!]+$/, ''));
    if (id) return id;
  }
  return null;
}
