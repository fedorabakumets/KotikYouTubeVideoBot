/** @fileoverview Выбор качества скачивания видео, Shorts или звука с YouTube. */
import {api} from 'sdk';
import {messageVideoId} from '../lib/links.js';

/**
 * Принимает ссылку и предлагает подходящий формат.
 * @param {object} message - Личное сообщение Telegram.
 * @returns {Promise<object|void>} Ответ бота.
 */
export default async function handleMessage(message) {
  if (message.chat?.type !== 'private' || message.from?.id !== message.chat.id) return;
  const command = (message.text || '').split(/\s|@/)[0].toLowerCase();
  if (['/start', '/help'].includes(command)) return api.sendMessage({chat_id: message.chat.id,
    text: '🐱 Пришли ссылку YouTube или Shorts и выбери качество видео либо только звук.\n\nОтправляю файлы до 2 ГБ через сервер больших файлов. Если он недоступен, использую обычный Telegram API для файлов до 50 МБ. Ограничения в 10 минут больше нет.\n\nЕсли ролик не помещается, попробуй 360p.'});
  const id = messageVideoId(message);
  if (!id) return api.sendMessage({chat_id: message.chat.id, text: 'Пришли ссылку youtube.com/watch, youtu.be или YouTube Shorts.'});
  return api.sendMessage({chat_id: message.chat.id, text: 'Что скачать?', reply_markup: {inline_keyboard: [
    [{text: '🎬 Видео до 720p', callback_data: 'yt:720:' + id}, {text: '📱 Видео до 360p', callback_data: 'yt:360:' + id}],
    [{text: '🎵 Только звук', callback_data: 'yt:audio:' + id}],
  ]}});
}
