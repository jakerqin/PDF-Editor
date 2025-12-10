import { StandardFonts } from 'pdf-lib';

/**
 * 字体管理模块
 * 负责字体的加载、缓存和管理
 */

export interface FontConfig {
  id: string;
  name: string;
  cssFamily: string; // CSS font-family 名称
  blob?: Blob; // 本地字体文件数据
  blobLoader?: () => Promise<Blob>; // 懒加载 Blob 的函数（用于本地字体）
  isStandard?: boolean; // 是否为 PDF 标准字体
  standardFont?: StandardFonts; // 标准字体枚举值
}

// 内置字体配置（使用 PDF 标准字体）
export const FONTS: FontConfig[] = [
  {
    id: 'helvetica',
    name: 'Helvetica',
    cssFamily: 'Helvetica, Arial, sans-serif',
    isStandard: true,
    standardFont: StandardFonts.Helvetica,
  },
  {
    id: 'helvetica-bold',
    name: 'Helvetica Bold',
    cssFamily: 'Helvetica, Arial, sans-serif',
    isStandard: true,
    standardFont: StandardFonts.HelveticaBold,
  },
  {
    id: 'helvetica-oblique',
    name: 'Helvetica Oblique',
    cssFamily: 'Helvetica, Arial, sans-serif',
    isStandard: true,
    standardFont: StandardFonts.HelveticaOblique,
  },
  {
    id: 'times-roman',
    name: 'Times Roman',
    cssFamily: '"Times New Roman", Times, serif',
    isStandard: true,
    standardFont: StandardFonts.TimesRoman,
  },
  {
    id: 'times-bold',
    name: 'Times Bold',
    cssFamily: '"Times New Roman", Times, serif',
    isStandard: true,
    standardFont: StandardFonts.TimesRomanBold,
  },
  {
    id: 'times-italic',
    name: 'Times Italic',
    cssFamily: '"Times New Roman", Times, serif',
    isStandard: true,
    standardFont: StandardFonts.TimesRomanItalic,
  },
  {
    id: 'courier',
    name: 'Courier',
    cssFamily: '"Courier New", Courier, monospace',
    isStandard: true,
    standardFont: StandardFonts.Courier,
  },
  {
    id: 'courier-bold',
    name: 'Courier Bold',
    cssFamily: '"Courier New", Courier, monospace',
    isStandard: true,
    standardFont: StandardFonts.CourierBold,
  },
  {
    id: 'courier-oblique',
    name: 'Courier Oblique',
    cssFamily: '"Courier New", Courier, monospace',
    isStandard: true,
    standardFont: StandardFonts.CourierOblique,
  },
];

// 自定义字体（本地字体）
let customFonts: FontConfig[] = [];

// 默认字体
export const DEFAULT_FONT_ID = 'helvetica';

// 字体缓存（存储已加载的字体 ArrayBuffer）
const fontCache: Map<string, ArrayBuffer> = new Map();

// 字体加载状态
const fontLoadingPromises: Map<string, Promise<ArrayBuffer>> = new Map();

/**
 * 获取所有可用字体（内置 + 自定义）
 */
export function getAllFonts(): FontConfig[] {
  return [...FONTS, ...customFonts];
}

/**
 * 获取字体配置
 */
export function getFontConfig(fontId: string): FontConfig | undefined {
  return getAllFonts().find((f) => f.id === fontId);
}

/**
 * 获取默认字体配置
 */
export function getDefaultFont(): FontConfig {
  return FONTS.find((f) => f.id === DEFAULT_FONT_ID) || FONTS[0];
}

/**
 * 加载字体文件（带缓存）
 * 对于标准字体，返回空的 ArrayBuffer，因为不需要嵌入
 */
export async function loadFont(fontId: string): Promise<ArrayBuffer> {
  // 检查缓存
  const cached = fontCache.get(fontId);
  if (cached) {
    return cached;
  }

  // 检查是否正在加载
  const loading = fontLoadingPromises.get(fontId);
  if (loading) {
    return loading;
  }

  // 获取字体配置
  const fontConfig = getFontConfig(fontId);
  if (!fontConfig) {
    throw new Error(`未找到字体: ${fontId}`);
  }

  // 如果是标准字体，不需要加载文件
  if (fontConfig.isStandard) {
    return new ArrayBuffer(0);
  }

  // 开始加载
  const loadPromise = (async () => {
    try {
      let arrayBuffer: ArrayBuffer;

      if (fontConfig.blob) {
        // 加载已有的本地字体 Blob
        arrayBuffer = await fontConfig.blob.arrayBuffer();
      } else if (fontConfig.blobLoader) {
        // 使用 blobLoader 延迟加载 Blob
        console.log(`延迟加载字体: ${fontConfig.name}`);
        const blob = await fontConfig.blobLoader();
        fontConfig.blob = blob; // 缓存 blob
        arrayBuffer = await blob.arrayBuffer();
      } else {
        throw new Error(`无效的字体配置: ${fontConfig.name}`);
      }

      // 缓存字体
      fontCache.set(fontId, arrayBuffer);
      fontLoadingPromises.delete(fontId);

      return arrayBuffer;
    } catch (error) {
      fontLoadingPromises.delete(fontId);
      throw error;
    }
  })();

  fontLoadingPromises.set(fontId, loadPromise);
  return loadPromise;
}

/**
 * 预加载所有字体
 */
export async function preloadAllFonts(): Promise<void> {
  // 标准字体不需要预加载
  const fontsToLoad = customFonts;
  await Promise.all(fontsToLoad.map((font) => loadFont(font.id)));
}

/**
 * 检查字体是否已缓存
 */
export function isFontCached(fontId: string): boolean {
  return fontCache.has(fontId);
}

/**
 * 获取已缓存的字体
 */
export function getCachedFont(fontId: string): ArrayBuffer | undefined {
  return fontCache.get(fontId);
}

/**
 * 注册 CSS 字体（用于 Canvas 预览）
 */
export async function registerCSSFonts(): Promise<void> {
  // 标准字体通常不需要注册，因为浏览器内置支持
  // 如果需要自定义字体，可以在这里处理
}

/**
 * 注册单个自定义字体到 CSS
 */
export async function registerCustomFontToCSS(font: FontConfig): Promise<void> {
  if (!font.blob) return;
  try {
    const buffer = await font.blob.arrayBuffer();
    const fontFace = new FontFace(font.cssFamily, buffer);
    await fontFace.load();
    document.fonts.add(fontFace);
    console.log(`自定义字体注册成功: ${font.name}`);
  } catch (error) {
    console.error(`自定义字体注册失败: ${font.name}`, error);
  }
}

/**
 * 获取字体的 CSS font-family 值
 */
export function getFontCSSFamily(fontId: string): string {
  const config = getFontConfig(fontId);
  return config ? config.cssFamily : 'sans-serif';
}

// Local Font Access API 类型定义
interface FontData {
  postscriptName: string;
  fullName: string;
  family: string;
  style: string;
  blob: () => Promise<Blob>;
}

declare global {
  interface Window {
    queryLocalFonts?: (options?: { postscriptNames?: string[] }) => Promise<FontData[]>;
  }
}

/**
 * 请求并注册本地系统字体
 */
export async function registerLocalFonts(): Promise<FontConfig[]> {
  if (!window.queryLocalFonts) {
    throw new Error('您的浏览器不支持访问本地字体，请使用 Chrome 或 Edge 浏览器。');
  }

  try {
    const localFontsData = await window.queryLocalFonts();

    // 过滤和转换字体
    const newFonts: FontConfig[] = [];

    // 为了性能，我们只取前 50 个或者让用户选择（这里简化为全部，但要注意性能）
    // 实际场景中，系统字体可能非常多，全部加载会很慢。
    // 这里我们做一个简单的去重和筛选
    const seenFamilies = new Set<string>();

    for (const fontData of localFontsData) {
      if (seenFamilies.has(fontData.fullName)) continue;
      seenFamilies.add(fontData.fullName);

      // 忽略一些特殊符号字体
      if (fontData.family.includes('Icon') || fontData.family.includes('Symbol')) continue;

      const fontId = `local-${fontData.postscriptName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      // 检查是否已存在
      if (getFontConfig(fontId)) continue;

      // 只保存元数据和 blob 加载器，不立即加载 blob
      const fontConfig: FontConfig = {
        id: fontId,
        name: fontData.fullName,
        cssFamily: fontData.family, // 使用 family 作为 CSS family
        blobLoader: () => fontData.blob(), // 延迟加载 blob
      };

      newFonts.push(fontConfig);
      customFonts.push(fontConfig);
    }

    console.log(`已注册 ${newFonts.length} 个本地字体（元数据）`);
    return newFonts;
  } catch (error) {
    console.error('获取本地字体失败:', error);
    throw error;
  }
}


