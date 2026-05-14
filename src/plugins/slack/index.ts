import type { ClientPlugin } from '@/core/plugin';
import { renderSlack, type SlackOptions } from './render';

export const slackPlugin: ClientPlugin<SlackOptions> = {
  id: 'slack',
  label: 'Slack',
  mimeType: 'slack/texty',
  defaultOptions: { detectEmoji: true },
  render: renderSlack,
};

export type { SlackOptions };
