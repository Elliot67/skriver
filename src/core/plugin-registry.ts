import { slackPlugin } from '@/plugins/slack';
import { teamsPlugin } from '@/plugins/teams';

export const plugins = [slackPlugin, teamsPlugin] as const;

export type PluginId = (typeof plugins)[number]['id'];
