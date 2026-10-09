/** @fileoverview Закрытая конфигурация доступа к обработчику скачивания. */
import {table, text} from 'sdk/db';
/** Настройки хранятся в базе бота и не публикуются в репозитории. */
export const settings = table('youtube_settings', {
  /** Имя настройки. */
  key: text('key').primaryKey(),
  /** Значение настройки, включая секрет доступа. */
  value: text('value').notNull(),
});
