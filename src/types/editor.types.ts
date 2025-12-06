import * as fabric from 'fabric';

// PDF 文档类型
export interface PDFDocumentState {
  file: File | null;
  pdfDoc: any; // pdf-lib PDFDocument
  pdfJsDoc: any; // pdfjs-dist PDFDocumentProxy
  numPages: number;
  currentPage: number;
  scale: number;
}

// 文本项类型（从 PDF 提取）
export interface PDFTextItem {
  str: string; // 文本内容
  x: number; // X 坐标
  y: number; // Y 坐标
  width: number; // 宽度
  height: number; // 高度
  fontSize: number; // 字体大小
  fontName: string; // 字体名称
  transform: number[]; // 变换矩阵
}

// 编辑操作类型
export enum EditOperationType {
  OVERLAY_TEXT = 'OVERLAY_TEXT', // 覆盖式文本编辑
  ADD_TEXT = 'ADD_TEXT', // 添加新文本
  ADD_IMAGE = 'ADD_IMAGE', // 添加图片
  ADD_MASK = 'ADD_MASK', // 添加遮罩（白色矩形）
}

// 文本样式
export interface TextStyle {
  fontId: string; // 字体 ID，对应 fontManager 中的配置
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string; // RGB 或 HEX
  align: 'left' | 'center' | 'right';
}

// 编辑操作基础接口
export interface BaseEditOperation {
  id: string;
  type: EditOperationType;
  pageNumber: number;
}

// 遮罩操作
export interface MaskOperation extends BaseEditOperation {
  type: EditOperationType.ADD_MASK;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 文本编辑操作
export interface TextEditOperation extends BaseEditOperation {
  type: EditOperationType.OVERLAY_TEXT | EditOperationType.ADD_TEXT;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: TextStyle;
  originalText?: string; // 原始文本（用于覆盖式编辑）
}

// 图片操作
export interface ImageOperation extends BaseEditOperation {
  type: EditOperationType.ADD_IMAGE;
  imageData: string; // Base64 编码的图片
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// 联合类型：所有编辑操作
export type EditOperation = MaskOperation | TextEditOperation | ImageOperation;

// 编辑器状态
export interface EditorState {
  operations: EditOperation[];
  selectedObjectId: string | null;
  tool: EditorTool;
  textStyle: TextStyle;
}

// 编辑工具
export enum EditorTool {
  SELECT = 'SELECT', // 选择工具
  TEXT = 'TEXT', // 文本工具
  IMAGE = 'IMAGE', // 图片工具
  EDIT_TEXT = 'EDIT_TEXT', // 编辑文本工具
}

// Fabric.js 对象扩展（添加自定义属性）
export interface CustomFabricObject extends fabric.Object {
  editOperationId?: string;
  isEditOperation?: boolean;
}

// 页面渲染信息
export interface PageRenderInfo {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  viewport: any; // pdfjs Viewport
  textItems: PDFTextItem[];
}

// 导出配置
export interface ExportOptions {
  fileName: string;
  compress: boolean;
}

