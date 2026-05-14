import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ClientPlugin } from '../plugin';
import { writeForPlugin } from '../clipboard';

const plugin: ClientPlugin = {
  id: 'slack',
  label: 'Slack',
  mimeType: 'slack/texty',
  defaultOptions: {},
  render: () => ({ output: '', warnings: [] }),
};

type ExecCommand = (cmd: string) => boolean;

function setExecCommand(impl: ExecCommand): void {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    writable: true,
    value: impl,
  });
}

describe('writeForPlugin', () => {
  let setData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setData = vi.fn<(type: string, data: string) => void>();
    setExecCommand((cmd) => {
      if (cmd !== 'copy') return false;
      const event = new Event('copy') as ClipboardEvent;
      Object.defineProperty(event, 'clipboardData', {
        value: { setData },
        configurable: true,
      });
      document.dispatchEvent(event);
      return true;
    });
  });

  afterEach(() => {
    delete (document as unknown as { execCommand?: ExecCommand }).execCommand;
  });

  it('sets the payload on the copy event with the plugin mime type', async () => {
    await writeForPlugin(plugin, '{"ops":[]}');
    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenCalledWith('slack/texty', '{"ops":[]}');
  });

  it('also writes a text/plain companion when provided', async () => {
    await writeForPlugin(plugin, '{"ops":[]}', 'Hello world');
    expect(setData).toHaveBeenCalledWith('slack/texty', '{"ops":[]}');
    expect(setData).toHaveBeenCalledWith('text/plain', 'Hello world');
  });

  it('does not double-write when the plugin is already text/plain', async () => {
    const plainPlugin: ClientPlugin = { ...plugin, mimeType: 'text/plain' };
    await writeForPlugin(plainPlugin, 'hi', 'hi');
    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenCalledWith('text/plain', 'hi');
  });

  it('rejects when execCommand reports failure', async () => {
    setExecCommand(() => false);
    await expect(writeForPlugin(plugin, 'x')).rejects.toThrow(/copy/i);
  });

  it('rejects when execCommand throws', async () => {
    setExecCommand(() => {
      throw new Error('boom');
    });
    await expect(writeForPlugin(plugin, 'x')).rejects.toThrow('boom');
  });
});
