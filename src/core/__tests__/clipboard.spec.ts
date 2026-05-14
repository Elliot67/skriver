import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ClientPlugin } from '../plugin';
import { readPasteEvent, writeForPlugin, writeManyViaCopyEvent } from '../clipboard';

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

describe('writeManyViaCopyEvent', () => {
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

  it('writes each entry as its own setData call', async () => {
    await writeManyViaCopyEvent([
      { mimeType: 'slack/texty', payload: '{"ops":[]}' },
      { mimeType: 'text/html', payload: '<b>hi</b>' },
      { mimeType: 'text/plain', payload: 'hi' },
    ]);
    expect(setData).toHaveBeenCalledTimes(3);
    expect(setData).toHaveBeenNthCalledWith(1, 'slack/texty', '{"ops":[]}');
    expect(setData).toHaveBeenNthCalledWith(2, 'text/html', '<b>hi</b>');
    expect(setData).toHaveBeenNthCalledWith(3, 'text/plain', 'hi');
  });

  it('does not auto-inject text/plain when absent', async () => {
    await writeManyViaCopyEvent([{ mimeType: 'slack/texty', payload: 'x' }]);
    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenCalledWith('slack/texty', 'x');
  });

  it('still resolves when given zero entries', async () => {
    await expect(writeManyViaCopyEvent([])).resolves.toBeUndefined();
    expect(setData).not.toHaveBeenCalled();
  });
});

describe('readPasteEvent', () => {
  function makePasteEvent(payloads: Record<string, string>): ClipboardEvent {
    const event = new Event('paste') as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: {
        types: Object.keys(payloads),
        getData: (type: string) => payloads[type] ?? '',
      },
      configurable: true,
    });
    return event;
  }

  it('returns one entry per type with payloads', () => {
    const result = readPasteEvent(
      makePasteEvent({ 'slack/texty': '{"ops":[]}', 'text/plain': 'hi' }),
    );
    expect(result).toEqual([
      { mimeType: 'slack/texty', payload: '{"ops":[]}', binary: false },
      { mimeType: 'text/plain', payload: 'hi', binary: false },
    ]);
  });

  it('flags empty payloads as binary', () => {
    const result = readPasteEvent(
      makePasteEvent({ 'image/png': '', 'text/plain': 'caption' }),
    );
    expect(result).toEqual([
      { mimeType: 'image/png', payload: '', binary: true },
      { mimeType: 'text/plain', payload: 'caption', binary: false },
    ]);
  });

  it('returns an empty array when clipboardData is missing', () => {
    const event = new Event('paste') as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', { value: null, configurable: true });
    expect(readPasteEvent(event)).toEqual([]);
  });
});
