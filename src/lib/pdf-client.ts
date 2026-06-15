// Client-side PDF text extraction using pdfjs-dist.
import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker URL
// eslint-disable-next-line import/no-unresolved
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type ExtractedPdf = {
  pageCount: number;
  fullText: string;
  pages: string[];
};

export async function extractPdfText(file: File | ArrayBuffer): Promise<ExtractedPdf> {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }
  return {
    pageCount: pdf.numPages,
    pages,
    fullText: pages.join("\n\n"),
  };
}
