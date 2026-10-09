/** @fileoverview Закрытый HTTP-вход для заданий Telegram Serverless и проверка здоровья. */
import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {enqueue, validJob} from './jobs.js';

/**
 * Проверяет секрет без сравнения строк с зависимым от совпадения временем.
 * @param {string} authorization - Заголовок запроса.
 * @returns {boolean} Доступ подтверждён.
 */
function authorized(authorization) {
  const expected = Buffer.from('Bearer ' + process.env.WORKER_KEY);
  const actual = Buffer.from(authorization || '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Отправляет компактный JSON-ответ.
 * @param {object} response - Ответ HTTP.
 * @param {number} status - Статус HTTP.
 * @param {object} value - Полезная нагрузка.
 * @returns {void} Ответ отправлен.
 */
function reply(response, status, value) {
  response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  response.end(JSON.stringify(value));
}

if (!process.env.WORKER_KEY || !process.env.BOT_TOKEN) throw new Error('Не заданы переменные доступа.');
const server = createServer(async (request, response) => {
  if (request.url === '/health' && request.method === 'GET') return reply(response, 200, {ok: true});
  if (request.url !== '/jobs' || request.method !== 'POST') return reply(response, 404, {accepted: false});
  if (!authorized(request.headers.authorization)) return reply(response, 401, {accepted: false});
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > 4096) return reply(response, 413, {accepted: false});
    }
    const job = JSON.parse(body);
    if (!validJob(job)) return reply(response, 400, {accepted: false});
    const result = enqueue(job);
    reply(response, result.accepted ? 202 : 429, result);
  } catch { reply(response, 400, {accepted: false}); }
});
server.requestTimeout = 15000;
server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Обработчик YouTube готов.'));
