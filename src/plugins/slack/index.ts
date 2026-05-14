import type { ClientPlugin } from '@/core/plugin';
import { renderSlack, type SlackOptions } from './render';

export const slackPlugin: ClientPlugin<SlackOptions> = {
  id: 'slack',
  label: 'Slack',
  icon: 'i-simple-icons:slack',
  mimeType: 'slack/texty',
  defaultOptions: {},
  render: renderSlack,
};

export type { SlackOptions };
