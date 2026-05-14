import { jiraPlugin } from '@/plugins/jira';
import { slackPlugin } from '@/plugins/slack';
import { teamsPlugin } from '@/plugins/teams';

export const plugins = [slackPlugin, teamsPlugin, jiraPlugin] as const;

export type PluginId = (typeof plugins)[number]['id'];
