/** @fileoverview Запуск выбранного формата скачивания после нажатия кнопки. */
import {api} from 'sdk';
import {startJob} from '../lib/jobs.js';

/**
 * Проверяет владельца сообщения и запускает скачивание.
 * @param {object} query - Нажатие кнопки Telegram.
 * @returns {Promise<void>} Завершение обработки.
 */
export default async function handleCallback(query) {
  const message = query.message;
  const match = (query.data || '').match(/^yt:(720|360|audio):([\w-]{11})$/);
  if (!match || message?.chat.type !== 'private' || message.chat.id !== query.from?.id) {
    await api.answerCallbackQuery({callback_query_id: query.id, text: 'Открой бота и пришли ссылку ещё раз.'});
    return;
  }
  await api.answerCallbackQuery({callback_query_id: query.id});
  await startJob(message.chat.id, match[2], match[1], message.message_id);
}
