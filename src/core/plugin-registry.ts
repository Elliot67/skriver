import { jiraPlugin } from '@/plugins/jira';
import { notionPlugin } from '@/plugins/notion';
import { slackPlugin } from '@/plugins/slack';
import { teamsPlugin } from '@/plugins/teams';

export const plugins = [slackPlugin, teamsPlugin, jiraPlugin, notionPlugin] as const;

export type PluginId = (typeof plugins)[number]['id'];
