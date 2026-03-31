import { toPng } from "html-to-image";

export async function captureElement(element: HTMLElement): Promise<string> {
  return toPng(element, {
    quality: 1,
    pixelRatio: 4,
    backgroundColor: "#FFFFFF",
  });
}

export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
