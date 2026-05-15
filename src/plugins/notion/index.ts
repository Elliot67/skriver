import type { ClientPlugin } from '@/core/plugin';
import { renderNotion, type NotionOptions } from './render';

export const notionPlugin: ClientPlugin<NotionOptions> = {
  id: 'notion',
  label: 'Notion',
  icon: 'i-simple-icons:notion',
  mimeType: 'text/plain',
  defaultOptions: {},
  render: renderNotion,
};

export type { NotionOptions };
