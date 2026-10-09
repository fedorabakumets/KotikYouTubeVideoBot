/** @fileoverview Ограниченная очередь загрузок, очистка файлов и кеш отправленных медиа. */
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {download} from './download.js';
import {telegram, sendMedia, sendCached} from './telegram.js';
/** Запросы, ожидающие свободного загрузчика. */
const queue = [];
/** Пользователи с активной или ожидающей загрузкой. */
const users = new Set();
/** Идентификаторы недавно принятых запросов для защиты от повторной доставки. */
const requests = new Map();
/** Кеш файлов Telegram до перезапуска обработчика. */
const cache = new Map();
/** Количество выполняющихся загрузок. */
let active = 0;

/**
 * Проверяет поля задания перед постановкой в очередь.
 * @param {object} job - Входящее задание.
 * @returns {boolean} Все параметры допустимы.
 */
export function validJob(job) {
  return Number.isSafeInteger(job?.chatId) && job.chatId > 0
    && Number.isSafeInteger(job.progressId) && job.progressId > 0
    && Number.isSafeInteger(job.requestId) && job.requestId > 0
    && /^[\w-]{11}$/.test(job.videoId) && ['360', '720', 'audio'].includes(job.mode);
}

/**
 * Добавляет одно задание на пользователя с ограничением общей очереди.
 * @param {object} job - Проверенное задание.
 * @returns {object} Принятие либо причина отказа.
 */
export function enqueue(job) {
  const now = Date.now(), key = `${job.chatId}:${job.requestId}:${job.mode}`;
  for (const [id, expires] of requests) if (expires <= now) requests.delete(id);
  if (requests.has(key)) return {accepted: false, message: 'Этот запрос уже принят. Пришли ссылку ещё раз для повторного скачивания.'};
  if (users.has(job.chatId)) return {accepted: false, message: 'Дождись завершения предыдущей загрузки.'};
  if (queue.length + active >= 10) return {accepted: false, message: 'Очередь заполнена. Попробуй через минуту.'};
  requests.set(key, now + 1800000);
  users.add(job.chatId);
  queue.push(job);
  pump();
  return {accepted: true};
}

/** @returns {void} Запускает ожидающие задания, пока доступен загрузчик. */
function pump() {
  while (active < 2 && queue.length) {
    const job = queue.shift();
    active++;
    execute(job).finally(() => {active--; users.delete(job.chatId); pump();});
  }
}

/**
 * Выполняет задание и удаляет временные файлы при любом результате.
 * @param {object} job - Задание пользователя.
 * @returns {Promise<void>} Завершение отправки или уведомления об ошибке.
 */
async function execute(job) {
  let directory;
  try {
    const key = job.videoId + ':' + job.mode, saved = cache.get(key);
    if (saved) await sendCached(job, saved);
    else {
      directory = await mkdtemp(join(tmpdir(), 'kotik-youtube-'));
      const file = await download(job, directory);
      cache.set(key, await sendMedia(job, file));
      if (cache.size > 500) cache.delete(cache.keys().next().value);
    }
  } catch (error) {
    const text = error.message || '';
    const friendly = /минут|МБ|Трансляции|слишком большой/.test(text) ? text
      : /sign in|confirm.*bot|403|429/i.test(text) ? 'YouTube временно отклонил загрузку. Попробуй позже.'
      : /unavailable|private|removed/i.test(text) ? 'Видео недоступно. Пришли ссылку на публичный ролик.'
      : /TIMEOUT/.test(text) ? 'Скачивание заняло слишком долго. Попробуй короткий ролик или 360p.'
      : 'Не получилось скачать этот формат. Попробуй 360p или только звук.';
    console.log('Загрузка завершилась ошибкой.', /TELEGRAM_/.test(text) ? text : 'DOWNLOAD_ERROR');
    try { await telegram('sendMessage', {chat_id: job.chatId, text: friendly}); } catch {}
  } finally {
    try { await telegram('deleteMessage', {chat_id: job.chatId, message_id: job.progressId}); } catch {}
    if (directory) await rm(directory, {recursive: true, force: true});
  }
}
