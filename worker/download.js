/** @fileoverview Скачивание публичного ролика с ограничениями длительности и размера. */
import {readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {runDownloader} from './process.js';
/** Максимальный размер файла для отправки обычным Telegram Bot API. */
export const MAX_BYTES = 45 * 1024 * 1024;

/**
 * Проверяет публичность и размер публикации перед началом загрузки.
 * @param {object} info - Метаданные YouTube.
 * @returns {void} Успех либо понятная ошибка.
 */
export function validateInfo(info) {
  if (info.is_live || info.live_status === 'is_upcoming') throw new Error('Трансляции пока не поддерживаются.');
  if (!info.duration || info.duration > 600) throw new Error('Пока поддерживаются ролики до 10 минут.');
}

/**
 * Скачивает файл в отдельную временную папку запроса.
 * @param {object} job - Идентификатор видео и выбранный формат.
 * @param {string} directory - Временная папка загрузки.
 * @returns {Promise<object>} Путь файла, заголовок и длительность.
 */
export async function download(job, directory) {
  const url = 'https://www.youtube.com/watch?v=' + job.videoId;
  const info = JSON.parse(await runDownloader(['--dump-single-json', '--skip-download', url]));
  validateInfo(info);
  const format = job.mode === 'audio' ? 'bestaudio[ext=m4a]/bestaudio'
    : `bestvideo[height<=${job.mode}][vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/best[height<=${job.mode}][ext=mp4]`;
  const args = ['--max-filesize', String(MAX_BYTES), '-f', format, '-o', join(directory, 'media.%(ext)s')];
  if (job.mode === 'audio') args.push('-x', '--audio-format', 'm4a');
  else args.push('--merge-output-format', 'mp4', '--postprocessor-args', 'ffmpeg:-movflags +faststart');
  await runDownloader([...args, url]);
  const names = (await readdir(directory)).filter(name => /^media\.(mp4|m4a)$/.test(name));
  if (!names.length) throw new Error('Файл слишком большой. Попробуй качество 360p или только звук.');
  const path = join(directory, names[0]), size = (await stat(path)).size;
  if (size > MAX_BYTES) throw new Error('Файл больше 45 МБ. Попробуй качество 360p или только звук.');
  return {path, title: String(info.title || 'YouTube').slice(0, 180), duration: Math.round(info.duration)};
}
