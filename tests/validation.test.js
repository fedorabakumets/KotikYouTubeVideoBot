/** @fileoverview Проверка допустимых ссылок, ограничений роликов и входных заданий. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeId, messageVideoId} from '../tgcloud/lib/links.js';
import {validateInfo} from '../worker/download.js';
import {validJob} from '../worker/jobs.js';

test('Обычные ссылки, Shorts и скрытые ссылки Telegram', () => {
  for (const url of ['https://youtu.be/jNQXAC9IVRw?si=abc',
    'https://www.youtube.com/watch?feature=share&v=jNQXAC9IVRw',
    'https://m.youtube.com/shorts/jNQXAC9IVRw']) assert.equal(youtubeId(url), 'jNQXAC9IVRw');
  assert.equal(messageVideoId({entities: [{url: 'https://youtu.be/jNQXAC9IVRw'}]}), 'jNQXAC9IVRw');
});
test('Поддельные домены, произвольные адреса и некорректные идентификаторы', () => {
  for (const url of ['https://youtube.com.evil/watch?v=jNQXAC9IVRw',
    'https://youtube.com@evil/watch?v=jNQXAC9IVRw', 'http://127.0.0.1/watch?v=jNQXAC9IVRw',
    'https://youtu.be/jNQXAC9IVRwmore', 'https://www.youtube.com/watch?v=bad']) assert.equal(youtubeId(url), null);
});
test('Длинные ролики поддерживаются, трансляции отклоняются', () => {
  assert.doesNotThrow(() => validateInfo({duration: 19}));
  assert.doesNotThrow(() => validateInfo({duration: 7200}));
  assert.throws(() => validateInfo({duration: 19, is_live: true}), /Трансляции/);
});
test('Закрытый обработчик принимает только корректные задания', () => {
  const job = {chatId: 1612141295, progressId: 1, requestId: 2, videoId: 'jNQXAC9IVRw', mode: '360'};
  assert.equal(validJob(job), true);
  assert.equal(validJob({...job, chatId: -1}), false);
  assert.equal(validJob({...job, videoId: '../../etc'}), false);
  assert.equal(validJob({...job, mode: 'command'}), false);
});
