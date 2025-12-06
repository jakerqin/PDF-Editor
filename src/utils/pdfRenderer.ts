import * as pdfjsLib from 'pdfjs-dist';
import { PDFTextItem, PageRenderInfo } from '../types/editor.types';

// 配置 PDF.js worker - 使用 unpkg CDN（更稳定）
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * 加载 PDF 文档
 */
export async function loadPDFDocument(file: File): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * 渲染 PDF 页面到 Canvas
 */
export async function renderPDFPage(
  pdfDoc: any,
  pageNumber: number,
  scale: number = 1.5
): Promise<PageRenderInfo> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // 创建 Canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法获取 Canvas 2D 上下文');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // 渲染 PDF 页面
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  // 提取文本内容
  const textItems = await extractTextFromPage(page, viewport);
  
  // 调试：打印提取的文本数量
  console.log(`[PDF渲染] 页面 ${pageNumber} 提取了 ${textItems.length} 个文本项`);
  if (textItems.length > 0) {
    console.log('[PDF渲染] 前3个文本:', textItems.slice(0, 3));
  }

  return {
    pageNumber,
    canvas,
    viewport,
    textItems,
  };
}

/**
 * 从 PDF 页面提取文本及位置信息
 */
async function extractTextFromPage(
  page: any,
  viewport: any
): Promise<PDFTextItem[]> {
  const textContent = await page.getTextContent();
  const textItems: PDFTextItem[] = [];

  textContent.items.forEach((item: any) => {
    if (!item.str || item.str.trim() === '') {
      return; // 跳过空文本
    }

    // PDF.js 返回的坐标需要通过 viewport 转换
    const transform = pdfjsLib.Util.transform(
      viewport.transform,
      item.transform
    );

    const x = transform[4];
    const y = viewport.height - transform[5]; // 转换Y坐标（PDF坐标系翻转）
    const height = item.height * viewport.scale;
    const width = item.width * viewport.scale;

    textItems.push({
      str: item.str,
      x,
      y: y - height, // 调整Y坐标到文本顶部
      width,
      height,
      fontSize: height,
      fontName: item.fontName || 'Unknown',
      transform: item.transform,
    });
  });

  return textItems;
}

/**
 * 在文本项数组中查找指定坐标处的文本
 */
export function findTextAtPosition(
  textItems: PDFTextItem[],
  x: number,
  y: number,
  tolerance: number = 5
): PDFTextItem | null {
  for (const item of textItems) {
    const inXRange =
      x >= item.x - tolerance && x <= item.x + item.width + tolerance;
    const inYRange =
      y >= item.y - tolerance && y <= item.y + item.height + tolerance;

    if (inXRange && inYRange) {
      return item;
    }
  }

  return null;
}

/**
 * 获取 PDF 页面的缩略图
 */
export async function generatePageThumbnail(
  pdfDoc: any,
  pageNumber: number,
  maxWidth: number = 150
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  
  // 计算缩略图比例
  const scale = maxWidth / viewport.width;
  const thumbnailViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法获取 Canvas 2D 上下文');
  }

  canvas.height = thumbnailViewport.height;
  canvas.width = thumbnailViewport.width;

  await page.render({
    canvasContext: context,
    viewport: thumbnailViewport,
  }).promise;

  return canvas.toDataURL();
}

