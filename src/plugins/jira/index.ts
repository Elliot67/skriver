import type { ClientPlugin } from '@/core/plugin';
import { renderJira, type JiraOptions } from './render';

export const jiraPlugin: ClientPlugin<JiraOptions> = {
  id: 'jira',
  label: 'Jira',
  icon: 'i-simple-icons:jirasoftware',
  mimeType: 'text/html',
  defaultOptions: {},
  render: renderJira,
};

export type { JiraOptions };
