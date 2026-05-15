import type { ClientPlugin } from './plugin';

export interface ClipboardEntry {
  mimeType: string;
  payload: string;
}

export interface PasteEntry {
  mimeType: string;
  payload: string;
  binary: boolean;
}

export async function writeForPlugin(plugin: ClientPlugin, payload: string, plainText?: string): Promise<void> {
  await writeViaCopyEvent(plugin.mimeType, payload, plainText);
}

// Chrome's `navigator.clipboard.write` only accepts a sanitized MIME allowlist
// (text/plain, text/html, image/png, and `web `-prefixed customs that native
// apps don't read). Slack reads the raw `slack/texty` from the OS clipboard, so
// the only working channel is the legacy `copy` event — synchronous setData on
// any MIME type, same mechanism Slack's own web client uses.
export function writeViaCopyEvent(mimeType: string, payload: string, plainText?: string): Promise<void> {
  return dispatchSyntheticCopy((clipboardData) => {
    clipboardData.setData(mimeType, payload);
    if (plainText !== undefined && mimeType !== 'text/plain') {
      clipboardData.setData('text/plain', plainText);
    }
  });
}

export function writeManyViaCopyEvent(entries: ClipboardEntry[]): Promise<void> {
  return dispatchSyntheticCopy((clipboardData) => {
    for (const entry of entries) {
      clipboardData.setData(entry.mimeType, entry.payload);
    }
  });
}

export function readPasteEvent(event: ClipboardEvent): PasteEntry[] {
  const data = event.clipboardData;
  if (!data) return [];
  const entries: PasteEntry[] = [];
  for (const type of data.types) {
    const payload = data.getData(type);
    entries.push({ mimeType: type, payload, binary: payload === '' });
  }
  return entries;
}

function dispatchSyntheticCopy(applyData: (clipboardData: DataTransfer) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const helper = document.createElement('textarea');
    helper.value = ' ';
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.top = '0';
    helper.style.left = '0';
    helper.style.opacity = '0';
    helper.style.pointerEvents = 'none';
    document.body.appendChild(helper);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    helper.focus();
    helper.select();

    let handled = false;
    let copyError: unknown = null;
    const onCopy = (e: Event) => {
      const event = e as ClipboardEvent;
      handled = true;
      try {
        event.preventDefault();
        if (event.clipboardData) applyData(event.clipboardData);
      } catch (err) {
        copyError = err;
      }
    };
    document.addEventListener('copy', onCopy, { capture: true, once: true });

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      copyError = err;
    } finally {
      document.removeEventListener('copy', onCopy, true);
      helper.remove();
      previouslyFocused?.focus();
    }

    if (copyError) {
      reject(copyError instanceof Error ? copyError : new Error(String(copyError)));
    } else if (!handled || !ok) {
      reject(new Error('Browser rejected the copy command'));
    } else {
      resolve();
    }
  });
}
