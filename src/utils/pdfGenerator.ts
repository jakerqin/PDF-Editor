import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Font } from 'fonteditor-core';
import {
  EditOperation,
  EditOperationType,
  TextEditOperation,
  ImageOperation,
  MaskOperation,
  DrawPathOperation,
} from '../types/editor.types';
import { loadFont, getFontConfig, FONTS } from './fontManager';

// 字体缓存（用于 PDF 嵌入）
type EmbeddedFontMap = Map<string, any>;

/**
 * 将编辑操作应用到 PDF 并生成新文件
 */
export async function generateEditedPDF(
  originalFile: File,
  operations: EditOperation[],
  pageHeight: number // Canvas 高度，用于坐标转换
): Promise<Uint8Array> {
  // 调试：打印所有操作
  console.log('=== 导出 PDF 调试信息 ===');
  console.log('操作数量:', operations.length);
  console.log('页面高度:', pageHeight);
  operations.forEach((op, index) => {
    console.log(`操作 ${index + 1}:`, JSON.stringify(op, null, 2));
  });
  console.log('=========================');

  // 加载原始 PDF
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // 注册 fontkit 以支持自定义字体
  pdfDoc.registerFontkit(fontkit);

  // 收集每个字体使用的字符
  const fontCharsMap = collectFontChars(operations);
  
  // 加载、子集化并嵌入字体
  const embeddedFonts: EmbeddedFontMap = new Map();
  const fontCharsEntries = Array.from(fontCharsMap.entries());
  
  for (const [fontId, chars] of fontCharsEntries) {
    try {
      const fontBytes = await loadFont(fontId);
      const fontConfig = getFontConfig(fontId);
      
      // 使用 fonteditor-core 进行字体子集化
      console.log(`正在子集化字体: ${fontConfig?.name}, 字符数: ${chars.length}`);
      const subsetBuffer = await subsetFontWithFonteditor(fontBytes, chars);
      
      // 嵌入子集化后的字体
      const embeddedFont = await pdfDoc.embedFont(subsetBuffer);
      embeddedFonts.set(fontId, embeddedFont);
      
      const originalSize = (fontBytes.byteLength / 1024 / 1024).toFixed(2);
      const subsetSize = (subsetBuffer.byteLength / 1024).toFixed(2);
      console.log(`字体子集化成功: ${fontConfig?.name} (${originalSize} MB → ${subsetSize} KB)`);
    } catch (error) {
      console.error(`字体子集化失败: ${fontId}`, error);
      // 回退：嵌入完整字体
      try {
        const fontBytes = await loadFont(fontId);
        const embeddedFont = await pdfDoc.embedFont(fontBytes);
        embeddedFonts.set(fontId, embeddedFont);
        console.log(`回退到完整字体: ${getFontConfig(fontId)?.name}`);
      } catch (fallbackError) {
        console.error(`完整字体嵌入也失败: ${fontId}`, fallbackError);
      }
    }
  }

  // 如果没有嵌入任何字体但有文本操作，加载默认字体
  if (embeddedFonts.size === 0 && operations.length > 0) {
    const textOps = operations.filter(
      op => op.type === EditOperationType.ADD_TEXT || op.type === EditOperationType.OVERLAY_TEXT
    );
    if (textOps.length > 0) {
      const defaultFontId = FONTS[0].id;
      const allText = textOps.map(op => (op as TextEditOperation).text).join('');
      const fontBytes = await loadFont(defaultFontId);
      try {
        const subsetBuffer = await subsetFontWithFonteditor(fontBytes, allText);
        const embeddedFont = await pdfDoc.embedFont(subsetBuffer);
        embeddedFonts.set(defaultFontId, embeddedFont);
      } catch {
        const embeddedFont = await pdfDoc.embedFont(fontBytes);
        embeddedFonts.set(defaultFontId, embeddedFont);
      }
    }
  }

  // 按页码分组操作
  const operationsByPage = groupOperationsByPage(operations);

  // 对每一页应用编辑操作
  for (const [pageNumber, pageOperations] of Object.entries(operationsByPage)) {
    const page = pdfDoc.getPage(parseInt(pageNumber) - 1); // PDF 页码从 0 开始
    const { height: pdfPageHeight } = page.getSize();

    for (const operation of pageOperations) {
      await applyOperation(
        operation,
        page,
        embeddedFonts,
        pageHeight,
        pdfPageHeight
      );
    }
  }

  // 保存 PDF
  return await pdfDoc.save();
}

/**
 * 使用 fonteditor-core 进行字体子集化
 */
async function subsetFontWithFonteditor(
  fontBuffer: ArrayBuffer,
  characters: string
): Promise<ArrayBuffer> {
  // 获取需要保留的字符的 Unicode 码点
  const glyphSet = new Set<number>();
  for (let i = 0; i < characters.length; i++) {
    glyphSet.add(characters.charCodeAt(i));
  }
  // 添加一些基本字符确保字体可用
  glyphSet.add(32); // 空格
  glyphSet.add(46); // 句号
  
  const subset = Array.from(glyphSet);

  // 读取字体
  const font = Font.create(fontBuffer, {
    type: 'ttf',
    subset: subset,
    hinting: true,
  });

  // 导出子集化后的字体为 ArrayBuffer
  const buffer = font.write({
    type: 'ttf',
    hinting: true,
    toBuffer: true,  // 确保返回 ArrayBuffer
  }) as ArrayBuffer;

  return buffer;
}

/**
 * 收集每个字体使用的字符
 * 返回 Map<fontId, characters>
 */
function collectFontChars(operations: EditOperation[]): Map<string, string> {
  const fontCharsMap = new Map<string, string>();
  
  operations.forEach((op) => {
    if (op.type === EditOperationType.ADD_TEXT || op.type === EditOperationType.OVERLAY_TEXT) {
      const textOp = op as TextEditOperation;
      const fontId = textOp.style.fontId;
      const text = textOp.text;
      
      if (fontId && text) {
        const existingChars = fontCharsMap.get(fontId) || '';
        // 合并字符，去重
        const allChars = existingChars + text;
        const charSet = new Set(allChars.split(''));
        const uniqueChars = Array.from(charSet).join('');
        fontCharsMap.set(fontId, uniqueChars);
      }
    }
  });
  
  return fontCharsMap;
}

/**
 * 按页码分组操作
 */
function groupOperationsByPage(
  operations: EditOperation[]
): Record<number, EditOperation[]> {
  const grouped: Record<number, EditOperation[]> = {};

  operations.forEach((op) => {
    if (!grouped[op.pageNumber]) {
      grouped[op.pageNumber] = [];
    }
    grouped[op.pageNumber].push(op);
  });

  return grouped;
}

/**
 * 应用单个编辑操作到 PDF 页面
 */
async function applyOperation(
  operation: EditOperation,
  page: any,
  embeddedFonts: EmbeddedFontMap,
  canvasHeight: number,
  pdfPageHeight: number
): Promise<void> {
  switch (operation.type) {
    case EditOperationType.ADD_MASK:
      applyMaskOperation(operation as MaskOperation, page, canvasHeight, pdfPageHeight);
      break;

    case EditOperationType.OVERLAY_TEXT:
    case EditOperationType.ADD_TEXT:
      await applyTextOperation(
        operation as TextEditOperation,
        page,
        embeddedFonts,
        canvasHeight,
        pdfPageHeight
      );
      break;

    case EditOperationType.ADD_IMAGE:
      await applyImageOperation(
        operation as ImageOperation,
        page,
        canvasHeight,
        pdfPageHeight
      );
      break;

    case EditOperationType.DRAW_PATH:
      applyDrawPathOperation(
        operation as DrawPathOperation,
        page,
        canvasHeight,
        pdfPageHeight
      );
      break;
  }
}

/**
 * 应用遮罩操作（白色矩形覆盖原文本）
 */
function applyMaskOperation(
  operation: MaskOperation,
  page: any,
  canvasHeight: number,
  pdfPageHeight: number
): void {
  const { x, y, width, height } = operation;
  
  // 计算缩放比例
  const scale = pdfPageHeight / canvasHeight;
  
  // 转换坐标和尺寸
  const pdfX = x * scale;
  const pdfY = pdfPageHeight - y * scale;
  const pdfWidth = width * scale;
  const pdfHeight = height * scale;

  page.drawRectangle({
    x: pdfX,
    y: pdfY - pdfHeight, // PDF 坐标系调整
    width: pdfWidth,
    height: pdfHeight,
    color: rgb(1, 1, 1), // 白色
    opacity: 1,
  });
}

/**
 * 应用文本操作
 */
async function applyTextOperation(
  operation: TextEditOperation,
  page: any,
  embeddedFonts: EmbeddedFontMap,
  canvasHeight: number,
  pdfPageHeight: number
): Promise<void> {
  const { text, x, y, style } = operation;
  
  // 计算缩放比例（Canvas 到 PDF 的转换）
  const scale = pdfPageHeight / canvasHeight;
  
  // 字体大小也需要按比例缩放
  const pdfFontSize = style.fontSize * scale;
  
  // 转换坐标：
  // - X 需要缩放
  // - Y 需要缩放、翻转，并考虑基线偏移
  // Fabric.js 的 y 是文本框顶部，PDF 的 y 是基线位置
  // 基线大约在文本顶部往下 fontSize 的位置（约 80-85%）
  const pdfX = x * scale;
  const baselineOffset = pdfFontSize * 0.85; // 基线偏移量
  const pdfY = pdfPageHeight - y * scale - baselineOffset;

  // 获取对应字体
  let font = embeddedFonts.get(style.fontId);
  if (!font) {
    // 使用第一个可用字体作为后备
    font = embeddedFonts.values().next().value;
  }

  if (!font) {
    console.error('没有可用的字体');
    return;
  }

  // 解析颜色
  const color = parseColor(style.color);

  page.drawText(text, {
    x: pdfX,
    y: pdfY,
    size: pdfFontSize,
    font: font,
    color,
  });
}

/**
 * 应用图片操作
 */
async function applyImageOperation(
  operation: ImageOperation,
  page: any,
  canvasHeight: number,
  pdfPageHeight: number
): Promise<void> {
  const { imageData, x, y, width, height, rotation } = operation;
  
  // 计算缩放比例
  const scale = pdfPageHeight / canvasHeight;
  
  // 转换坐标和尺寸
  const pdfX = x * scale;
  const pdfY = pdfPageHeight - y * scale;
  const pdfWidth = width * scale;
  const pdfHeight = height * scale;

  // 从 Base64 解码图片
  const imageBytes = base64ToBytes(imageData);

  // 根据图片类型嵌入
  let image;
  if (imageData.startsWith('data:image/png')) {
    image = await page.doc.embedPng(imageBytes);
  } else if (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/jpg')) {
    image = await page.doc.embedJpg(imageBytes);
  } else {
    throw new Error('不支持的图片格式');
  }

  page.drawImage(image, {
    x: pdfX,
    y: pdfY - pdfHeight,
    width: pdfWidth,
    height: pdfHeight,
    rotate: {
      angle: rotation,
      type: 'degrees',
    },
  });
}

/**
 * 解析颜色字符串为 PDF rgb 对象
 */
function parseColor(colorString: string): any {
  // 支持 HEX 和 RGB 格式
  if (colorString.startsWith('#')) {
    const hex = colorString.substring(1);
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  } else if (colorString.startsWith('rgb')) {
    const match = colorString.match(/\d+/g);
    if (match) {
      const r = parseInt(match[0]) / 255;
      const g = parseInt(match[1]) / 255;
      const b = parseInt(match[2]) / 255;
      return rgb(r, g, b);
    }
  }

  // 默认黑色
  return rgb(0, 0, 0);
}

/**
 * 应用绘制路径操作（背景笔）
 */
function applyDrawPathOperation(
  operation: DrawPathOperation,
  page: any,
  canvasHeight: number,
  pdfPageHeight: number
): void {
  const { path, color, strokeWidth } = operation;
  
  // 计算缩放比例
  const scale = pdfPageHeight / canvasHeight;
  const pdfStrokeWidth = strokeWidth * scale;
  
  // 解析颜色
  const strokeColor = parseColor(color);
  
  // 开始绘制路径
  if (!path || path.length === 0) return;
  
  // Fabric.js path 格式：[['M', x, y], ['L', x, y], ['Q', cx, cy, x, y], ...]
  for (let i = 0; i < path.length; i++) {
    const cmd = path[i];
    if (!cmd || cmd.length === 0) continue;
    
    const command = cmd[0];
    
    switch (command) {
      case 'M': // Move to
        if (cmd.length >= 3) {
          const x = cmd[1] * scale;
          const y = pdfPageHeight - cmd[2] * scale;
          page.moveTo(x, y);
        }
        break;
        
      case 'L': // Line to
        if (cmd.length >= 3) {
          const x = cmd[1] * scale;
          const y = pdfPageHeight - cmd[2] * scale;
          page.lineTo(x, y);
        }
        break;
        
      case 'Q': // Quadratic curve
        if (cmd.length >= 5) {
          const cx = cmd[1] * scale;
          const cy = pdfPageHeight - cmd[2] * scale;
          const x = cmd[3] * scale;
          const y = pdfPageHeight - cmd[4] * scale;
          page.quadraticCurveTo(cx, cy, x, y);
        }
        break;
        
      case 'C': // Cubic Bezier curve
        if (cmd.length >= 7) {
          const cp1x = cmd[1] * scale;
          const cp1y = pdfPageHeight - cmd[2] * scale;
          const cp2x = cmd[3] * scale;
          const cp2y = pdfPageHeight - cmd[4] * scale;
          const x = cmd[5] * scale;
          const y = pdfPageHeight - cmd[6] * scale;
          page.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        }
        break;
        
      case 'Z': // Close path
        page.closePath();
        break;
        
      default:
        console.warn(`未知的路径命令: ${command}`);
    }
  }
  
  // 设置描边样式并绘制
  page.setLineWidth(pdfStrokeWidth);
  page.setStrokingColor(strokeColor);
  page.stroke();
  
  console.log(`已应用绘制路径，颜色: ${color}, 粗细: ${strokeWidth}px`);
}

/**
 * Base64 转字节数组
 */
function base64ToBytes(base64String: string): Uint8Array {
  const base64Data = base64String.split(',')[1] || base64String;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * 下载 PDF 文件
 */
export function downloadPDF(pdfBytes: Uint8Array, fileName: string): void {
  // 创建新的 Uint8Array 确保数据正确复制
  const bytes = new Uint8Array(pdfBytes);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
