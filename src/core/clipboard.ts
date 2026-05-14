import type { ClientPlugin } from './plugin';

export async function writeForPlugin(
  plugin: ClientPlugin,
  payload: string,
  plainText?: string,
): Promise<void> {
  await writeViaCopyEvent(plugin.mimeType, payload, plainText);
}

// Chrome's `navigator.clipboard.write` only accepts a sanitized MIME allowlist
// (text/plain, text/html, image/png, and `web `-prefixed customs that native
// apps don't read). Slack reads the raw `slack/texty` from the OS clipboard, so
// the only working channel is the legacy `copy` event — synchronous setData on
// any MIME type, same mechanism Slack's own web client uses.
export function writeViaCopyEvent(
  mimeType: string,
  payload: string,
  plainText?: string,
): Promise<void> {
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
        event.clipboardData?.setData(mimeType, payload);
        if (plainText !== undefined && mimeType !== 'text/plain') {
          event.clipboardData?.setData('text/plain', plainText);
        }
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
