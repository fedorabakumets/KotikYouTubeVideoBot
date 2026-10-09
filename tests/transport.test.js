/** @fileoverview Проверка выбора сервера и ограничений резервной загрузки. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {sendWithFallback, LOCAL_LIMIT, CLOUD_LIMIT} from '../worker/transport.js';

test('Большой файл отправляется локальным API, маленький имеет резерв', async () => {
  const previous = process.env.LOCAL_BOT_API_URL;
  process.env.LOCAL_BOT_API_URL = 'https://local.example';
  const calls = [];
  /**
   * Имитирует ответ выбранного сервера.
   * @param {string} base - Адрес сервера.
   * @returns {Promise<object>} Подтверждение отправки.
   */
  async function success(base) {calls.push(base); return {message_id: 1};}
  /**
   * Имитирует отказ локального сервера и исправный обычный API.
   * @param {string} base - Адрес сервера.
   * @returns {Promise<object>} Подтверждение резервной отправки.
   */
  async function unavailable(base) {
    calls.push(base);
    if (base === 'https://local.example') throw new Error('TELEGRAM_CONNECTION');
    return {message_id: 2};
  }
  try {
    await sendWithFallback('sendVideo', () => ({}), 60_000_000, success);
    assert.deepEqual(calls.splice(0), ['https://local.example']);
    await sendWithFallback('sendVideo', () => ({}), CLOUD_LIMIT, unavailable);
    assert.deepEqual(calls.splice(0), ['https://local.example', 'https://api.telegram.org']);
    await assert.rejects(sendWithFallback('sendVideo', () => ({}), 60_000_000, unavailable), /50 МБ/);
    assert.deepEqual(calls.splice(0), ['https://local.example']);
    await assert.rejects(sendWithFallback('sendVideo', () => ({}), LOCAL_LIMIT + 1, success), /2 ГБ/);
    assert.deepEqual(calls, []);
  } finally {
    if (previous === undefined) delete process.env.LOCAL_BOT_API_URL;
    else process.env.LOCAL_BOT_API_URL = previous;
  }
});
