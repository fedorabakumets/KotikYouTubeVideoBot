/** @fileoverview Выбор сервера Bot API и резервная отправка допустимых файлов. */
/** Лимит загрузки обычного Telegram API в байтах. */
export const CLOUD_LIMIT = 50_000_000;
/** Консервативный предел файла для локального Bot API. */
export const LOCAL_LIMIT = 2_000_000_000;
/** Адрес обычного Telegram Bot API. */
const CLOUD = 'https://api.telegram.org';

/**
 * Выполняет запрос к выбранному серверу без вывода токена в ошибках.
 * @param {string} base - Адрес сервера.
 * @param {string} method - Метод Telegram.
 * @param {object|FormData} body - Параметры запроса.
 * @returns {Promise<object>} Полезная нагрузка ответа Telegram.
 */
export async function requestTelegram(base, method, body) {
  const multipart = body instanceof FormData;
  let response;
  try {
    response = await fetch(base.replace(/\/$/, '') + '/bot' + process.env.BOT_TOKEN + '/' + method, {
      method: 'POST', ...(multipart ? {} : {headers: {'Content-Type': 'application/json'}}),
      body: multipart ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(multipart ? 1800000 : 120000)});
  } catch { throw new Error('TELEGRAM_CONNECTION'); }
  let result;
  try { result = await response.json(); } catch { throw new Error('TELEGRAM_RESPONSE'); }
  if (!result.ok) throw new Error('TELEGRAM_' + (result.error_code || response.status));
  return result.result;
}

/**
 * Отправляет медиа локальным сервером с резервом на обычный API.
 * @param {string} method - Метод отправки.
 * @param {Function} bodyFactory - Создание нового тела для каждой попытки.
 * @param {number} size - Размер загружаемого файла, ноль для сохранённого идентификатора.
 * @param {Function} request - Необязательный транспорт для проверки резервной отправки.
 * @returns {Promise<object>} Сообщение Telegram.
 */
export async function sendWithFallback(method, bodyFactory, size = 0, request = requestTelegram) {
  if (size > LOCAL_LIMIT) throw new Error('Файл больше 2 ГБ. Попробуй качество 360p или только звук.');
  const local = process.env.LOCAL_BOT_API_URL;
  if (local) {
    try { return await request(local, method, await bodyFactory()); }
    catch {
      if (size > CLOUD_LIMIT) throw new Error('Сервер больших файлов недоступен. Обычный Telegram API принимает до 50 МБ. Попробуй позже или выбери 360p.');
      console.log('Локальный Bot API недоступен, пробуем обычный API.');
    }
  }
  if (size > CLOUD_LIMIT) throw new Error('Для файла больше 50 МБ нужен сервер больших файлов.');
  return request(CLOUD, method, await bodyFactory());
}
