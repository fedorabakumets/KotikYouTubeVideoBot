/** @fileoverview Отправка скачанного файла и сообщений через Telegram Bot API. */
import {openAsBlob} from 'node:fs';
import {basename} from 'node:path';
import {stat} from 'node:fs/promises';
import {requestTelegram, sendWithFallback} from './transport.js';

/**
 * Выполняет запрос, не раскрывая токен в диагностике.
 * @param {string} method - Метод Telegram.
 * @param {object|FormData} body - Параметры запроса.
 * @returns {Promise<object>} Ответ Telegram без оболочки.
 */
export async function telegram(method, body) {
  return requestTelegram('https://api.telegram.org', method, body);
}

/**
 * Отправляет видео или звук, читая файл с диска потоково.
 * @param {object} job - Получатель и формат.
 * @param {object} media - Загруженный файл.
 * @returns {Promise<object>} Данные отправленного файла для кеша.
 */
export async function sendMedia(job, media) {
  const audio = job.mode === 'audio', field = audio ? 'audio' : 'video';
  /** @returns {Promise<FormData>} Новое потоковое тело загрузки для каждой попытки. */
  async function makeBody() {
  const form = new FormData();
  form.set('chat_id', String(job.chatId));
  form.set('caption', media.title + '\nhttps://youtu.be/' + job.videoId);
  form.set(field, await openAsBlob(media.path, {type: audio ? 'audio/mp4' : 'video/mp4'}), basename(media.path));
  form.set('duration', String(media.duration));
  if (audio) form.set('title', media.title);
  else form.set('supports_streaming', 'true');
  return form;
  }
  const size = media.size ?? (await stat(media.path)).size;
  const message = await sendWithFallback(audio ? 'sendAudio' : 'sendVideo', makeBody, size);
  return {field, fileId: message[field].file_id, caption: message.caption};
}

/**
 * Отправляет ранее сохранённый Telegram-файл без повторной загрузки.
 * @param {object} job - Получатель.
 * @param {object} media - Сохранённый идентификатор файла.
 * @returns {Promise<object>} Сообщение Telegram.
 */
export function sendCached(job, media) {
  return sendWithFallback(media.field === 'audio' ? 'sendAudio' : 'sendVideo', () => ({
    chat_id: job.chatId, [media.field]: media.fileId, caption: media.caption}));
}
