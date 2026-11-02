import { MAX_BYTES, type DocumentData, type ParseOptions, type ParseReply } from './model';
declare const __PARSER_WORKER__: string;

export class DocumentReader {
  private cancel?: () => void;
  dispose(): void { this.cancel?.(); }

  parse(buffer: ArrayBuffer, extension: string, options: ParseOptions): Promise<DocumentData> {
    this.dispose();
    if (buffer.byteLength > MAX_BYTES) return Promise.reject(new Error('File exceeds the 20 MiB preview limit.'));
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([__PARSER_WORKER__], { type: 'text/javascript' }));
      let worker: Worker;
      try { worker = new Worker(url); }
      catch (error) { URL.revokeObjectURL(url); reject(error instanceof Error ? error : new Error('Unable to create the preview worker.')); return; }
      URL.revokeObjectURL(url);
      const finish = () => { window.clearTimeout(timer); worker.terminate(); this.cancel = undefined; };
      const timer = window.setTimeout(() => { finish(); reject(new Error('Preview timed out after 15 seconds. Try a smaller document.')); }, 15_000);
      this.cancel = () => { finish(); reject(new DOMException('Preview cancelled', 'AbortError')); };
      worker.onmessage = (event: MessageEvent<ParseReply>) => {
        finish();
        if (event.data.ok) resolve(event.data.data);
        else reject(new Error(event.data.error));
      };
      worker.onerror = () => { finish(); reject(new Error('The preview worker failed. Try reopening the file.')); };
      worker.postMessage({ buffer, extension, options }, [buffer]);
    });
  }
}
