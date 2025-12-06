/**
 * 字体管理模块
 * 负责字体的加载、缓存和管理
 */

export interface FontConfig {
  id: string;
  name: string;
  file: string;
  cssFamily: string; // CSS font-family 名称
}

// 内置字体配置
export const FONTS: FontConfig[] = [
  {
    id: 'noto-sans-sc',
    name: '思源黑体',
    file: '/fonts/NotoSansSC-Regular.ttf',
    cssFamily: 'Noto Sans SC',
  },
  {
    id: 'noto-serif-sc',
    name: '思源宋体',
    file: '/fonts/NotoSerifSC-Regular.ttf',
    cssFamily: 'Noto Serif SC',
  },
  {
    id: 'zcool-kuaile',
    name: '站酷快乐体',
    file: '/fonts/ZCOOLKuaiLe-Regular.ttf',
    cssFamily: 'ZCOOL KuaiLe',
  },
];

// 默认字体
export const DEFAULT_FONT_ID = 'noto-sans-sc';

// 字体缓存（存储已加载的字体 ArrayBuffer）
const fontCache: Map<string, ArrayBuffer> = new Map();

// 字体加载状态
const fontLoadingPromises: Map<string, Promise<ArrayBuffer>> = new Map();

/**
 * 获取字体配置
 */
export function getFontConfig(fontId: string): FontConfig | undefined {
  return FONTS.find((f) => f.id === fontId);
}

/**
 * 获取默认字体配置
 */
export function getDefaultFont(): FontConfig {
  return FONTS.find((f) => f.id === DEFAULT_FONT_ID) || FONTS[0];
}

/**
 * 加载字体文件（带缓存）
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

  // 开始加载
  const loadPromise = (async () => {
    try {
      const response = await fetch(fontConfig.file);
      if (!response.ok) {
        throw new Error(`字体加载失败: ${fontConfig.name}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      
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
  await Promise.all(FONTS.map((font) => loadFont(font.id)));
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
  for (const font of FONTS) {
    try {
      // 检查字体是否已注册
      const fontFace = new FontFace(font.cssFamily, `url(${font.file})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      console.log(`字体注册成功: ${font.name}`);
    } catch (error) {
      console.error(`字体注册失败: ${font.name}`, error);
    }
  }
}

/**
 * 获取字体的 CSS font-family 值
 */
export function getFontCSSFamily(fontId: string): string {
  const config = getFontConfig(fontId);
  return config ? config.cssFamily : 'sans-serif';
}

