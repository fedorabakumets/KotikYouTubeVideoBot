/** @fileoverview Передача загрузки внешнему обработчику с закрытым ключом из базы. */
import {api, db, fetch} from 'sdk';
import {eq} from 'sdk/db';
import {settings} from '../schema.js';

/**
 * Запускает загрузку, которая продолжится после завершения обработчика Serverless.
 * @param {number} chatId - Получатель файла.
 * @param {string} videoId - Проверенный идентификатор YouTube.
 * @param {string} mode - Качество видео или аудио.
 * @param {number} requestId - Идентификатор исходного сообщения.
 * @returns {Promise<void>} Подтверждение принятия запроса.
 */
export async function startJob(chatId, videoId, mode, requestId) {
  const progress = await api.sendMessage({chat_id: chatId, text: '⏳ Скачиваю с YouTube…'});
  try {
    const address = await db.select().from(settings).where(eq(settings.key, 'worker_url')).get();
    const secret = await db.select().from(settings).where(eq(settings.key, 'worker_key')).get();
    if (!address || !secret) throw new Error('Бот ещё настраивается. Попробуй позже.');
    const response = await fetch(address.value + '/jobs', {method: 'POST',
      headers: {Authorization: 'Bearer ' + secret.value},
      body: fetch.body.json({chatId, videoId, mode, progressId: progress.message_id, requestId})});
    const result = await response.json();
    if (!response.ok || !result.accepted) throw new Error(result.message || 'Сервис временно недоступен.');
  } catch (error) {
    try { await api.deleteMessage({chat_id: chatId, message_id: progress.message_id}); } catch {}
    await api.sendMessage({chat_id: chatId, text: error.code ? 'Сервис временно недоступен. Попробуй позже.' : error.message});
  }
}
