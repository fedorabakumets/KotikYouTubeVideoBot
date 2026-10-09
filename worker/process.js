/** @fileoverview Ограниченный по времени запуск загрузчика без оболочки. */
import {spawn} from 'node:child_process';

/**
 * Запускает yt-dlp, ограничивая длительность и объём диагностического вывода.
 * @param {string[]} args - Аргументы загрузчика.
 * @returns {Promise<string>} Стандартный вывод процесса.
 */
export function runDownloader(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'yt_dlp', '--js-runtimes', 'node', '--no-playlist',
      '--socket-timeout', '15', '--retries', '1', '--no-progress', ...args], {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => {timedOut = true; child.kill('SIGKILL');}, 180000);
    child.stdout.on('data', data => {stdout = (stdout + data).slice(-2000000);});
    child.stderr.on('data', data => {stderr = (stderr + data).slice(-4000);});
    child.once('error', error => {clearTimeout(timer); reject(error);});
    child.once('close', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(timedOut ? 'DOWNLOAD_TIMEOUT' : stderr));
      else resolve(stdout);
    });
  });
}
