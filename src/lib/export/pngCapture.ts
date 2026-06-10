import { toPng } from 'html-to-image';

export interface CapturePngOptions {
  filename: string;
  pixelRatio?: number;
  backgroundColor?: string;
  /** Optional capture width (helps wide tables). */
  width?: number;
}

const LIGHT_EXPORT_CLASS = 'force-light-export';

/** Capture a DOM node as PNG — always light/print styling regardless of UI theme. */
export async function captureElementAsPng(node: HTMLElement, options: CapturePngOptions): Promise<void> {
  const root = document.documentElement;
  const hadDark = root.classList.contains('dark');
  const width = options.width ?? Math.max(node.scrollWidth, node.clientWidth);

  node.classList.add(LIGHT_EXPORT_CLASS);
  if (hadDark) root.classList.remove('dark');

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  try {
    const dataUrl = await toPng(node, {
      pixelRatio: options.pixelRatio ?? 3,
      cacheBust: true,
      backgroundColor: options.backgroundColor ?? '#ffffff',
      width,
    });

    const link = document.createElement('a');
    link.download = options.filename.endsWith('.png') ? options.filename : `${options.filename}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    node.classList.remove(LIGHT_EXPORT_CLASS);
    if (hadDark) root.classList.add('dark');
  }
}
