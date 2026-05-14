import type { ClientPlugin } from '@/core/plugin';
import { renderTeams, type TeamsOptions } from './render';

export const teamsPlugin: ClientPlugin<TeamsOptions> = {
  id: 'teams',
  label: 'Microsoft Teams',
  mimeType: 'text/html',
  defaultOptions: {},
  render: renderTeams,
};

export type { TeamsOptions };
