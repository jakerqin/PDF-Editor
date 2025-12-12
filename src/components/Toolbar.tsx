import React, { useRef, useState } from 'react';
import {
  FileUp,
  Download,
  MousePointer2,
  Type,
  Image,
  Undo2,
  Minus,
  Plus,
  Paintbrush,
  Search,
} from 'lucide-react';
import { EditorTool, TextStyle, BrushSettings } from '../types/editor.types';
import { getAllFonts, registerLocalFonts } from '../utils/fontManager';
import { ColorPickerModal } from './ColorPickerModal';

interface ToolbarProps {
  currentTool: EditorTool;
  textStyle: TextStyle;
  brushSettings: BrushSettings;
  canUndo: boolean;
  isPickingColor: boolean;
  pickedColor: string | null;
  onToolChange: (tool: EditorTool) => void;
  onTextStyleChange: (style: Partial<TextStyle>) => void;
  onBrushSettingsChange: (settings: Partial<BrushSettings>) => void;
  onStartColorPicking: () => void;
  onUploadPDF: (file: File) => void;
  onExportPDF: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  scale: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  textStyle,
  brushSettings,
  canUndo,
  isPickingColor,
  pickedColor,
  onToolChange,
  onTextStyleChange,
  onBrushSettingsChange,
  onStartColorPicking,
  onUploadPDF,
  onExportPDF,
  onUndo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  scale,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [fonts, setFonts] = useState(getAllFonts());
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [fontSearchTerm, setFontSearchTerm] = useState('');
  const [filteredFonts, setFilteredFonts] = useState(getAllFonts());

  // 当收到取色结果时打开 modal
  React.useEffect(() => {
    if (pickedColor) {
      setIsColorPickerOpen(true);
    }
  }, [pickedColor]);

  // 自动加载系统字体（如果支持）
  React.useEffect(() => {
    const loadSystemFonts = async () => {
      if (window.queryLocalFonts) {
        try {
          setIsLoadingFonts(true);
          await registerLocalFonts();
          const loadedFonts = getAllFonts();
          setFonts(loadedFonts);
          setFilteredFonts(loadedFonts);
          console.log('系统字体已自动加载');
        } catch (err) {
          console.error('自动加载系统字体失败:', err);
        } finally {
          setIsLoadingFonts(false);
        }
      }
    };

    loadSystemFonts();
  }, []);

  // 输入框聚焦时打开下拉框
  const handleInputFocus = () => {
    setIsFontDropdownOpen(true);
  };

  // 输入框内容变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFontSearchTerm(value);

    // 如果输入框被清空，立即显示所有字体
    if (value.trim() === '') {
      setFilteredFonts(fonts);
    }
  };

  // 执行搜索（点击搜索按钮或按下回车键时触发）
  const handleSearch = () => {
    const searchValue = fontSearchTerm.trim().toLowerCase();
    if (searchValue === '') {
      setFilteredFonts(fonts);
    } else {
      const filtered = fonts.filter(font =>
        font.name.toLowerCase().includes(searchValue)
      );
      setFilteredFonts(filtered);
    }

    // 如果下拉框未打开，则打开它
    if (!isFontDropdownOpen) {
      setIsFontDropdownOpen(true);
    }
  };

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // 选择字体
  const handleFontSelect = (fontId: string) => {
    onTextStyleChange({ fontId });
    setIsFontDropdownOpen(false);
    setFontSearchTerm('');
    setFilteredFonts(fonts);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUploadPDF(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        if (typeof (window as any).addImageToCanvas === 'function') {
          (window as any).addImageToCanvas(imageUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="toolbar">
      {/* 左侧：文件操作 */}
      <div className="toolbar-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary"
        >
          <FileUp size={18} />
          <span>打开 PDF</span>
        </button>

        <button onClick={onExportPDF} className="btn btn-success">
          <Download size={18} />
          <span>导出 PDF</span>
        </button>
      </div>

      {/* 中间：编辑工具 */}
      <div className="toolbar-section">
        <button
          onClick={() => onToolChange(EditorTool.SELECT)}
          className={`btn btn-ghost btn-icon ${currentTool === EditorTool.SELECT ? 'active' : ''}`}
          title="选择工具"
        >
          <MousePointer2 size={18} />
        </button>

        <button
          onClick={() => onToolChange(EditorTool.TEXT)}
          className={`btn btn-ghost btn-icon ${currentTool === EditorTool.TEXT ? 'active' : ''}`}
          title="添加文本"
        >
          <Type size={18} />
        </button>

        <button
          onClick={() => {
            onStartColorPicking();
          }}
          className={`btn btn-ghost btn-icon ${isPickingColor || currentTool === EditorTool.BRUSH ? 'active' : ''}`}
          title={isPickingColor ? '点击页面取色' : '背景笔'}
        >
          <Paintbrush size={18} />
        </button>

        <div className="toolbar-divider" />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden-input"
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          className="btn btn-ghost btn-icon"
          title="插入图片"
        >
          <Image size={18} />
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="btn btn-ghost btn-icon"
          title="撤销"
        >
          <Undo2 size={18} />
        </button>
      </div>

      {/* 右侧：格式工具和缩放 */}
      <div className="toolbar-section">
        {/* 背景笔设置（仅在选中背景笔工具时显示） */}
        {currentTool === EditorTool.BRUSH && (
          <>
            <select
              value={brushSettings.strokeWidth}
              onChange={(e) => onBrushSettingsChange({ strokeWidth: parseInt(e.target.value) })}
              className="select-input"
              title="画笔粗细"
            >
              {[10, 20, 30, 40, 50].map((width) => (
                <option key={width} value={width}>
                  {width}px
                </option>
              ))}
            </select>
            <div className="toolbar-divider" />
          </>
        )}

        {/* 字体选择 (搜索框 + 下拉框) */}
        <div className="w-[256px]" style={{flexShrink: 0 }}>
          {/* 搜索输入框 */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
            <input
              ref={fontInputRef}
              type="text"
              className="w-full pl-10 pr-16 py-2 text-sm border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder={
                !fontSearchTerm && textStyle.fontId
                  ? fonts.find(f => f.id === textStyle.fontId)?.name || fonts[0]?.name || '选择字体'
                  : '搜索字体...'
              }
              value={fontSearchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyPress}
              disabled={isLoadingFonts}
              style={{
                fontFamily: !fontSearchTerm && textStyle.fontId
                  ? fonts.find(f => f.id === textStyle.fontId)?.cssFamily
                  : 'inherit'
              }}
            />
            <button
              onClick={handleSearch}
              className={`absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 px-3 py-1 rounded text-xs font-medium transition-all duration-200 hover:bg-blue-50 ${
                fontSearchTerm ? 'opacity-100 visible' : 'opacity-0 invisible'
              }`}
              disabled={isLoadingFonts}
            >
              搜索
            </button>
          </div>

          {/* 下拉框 */}
          {isFontDropdownOpen && (
            <div
              className="absolute bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden w-[256px] max-h-[300px] z-[9999]">
              {/* 字体列表 */}
              <div className="overflow-y-auto max-h-[300px]">
                {(() => {
                  if (filteredFonts.length === 0) {
                    return (
                      <div className="px-3 py-8 text-gray-400 text-xs text-center">
                        未找到匹配的字体
                      </div>
                    );
                  }

                  return filteredFonts.map((font) => (
                    <button
                      key={font.id}
                      className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                        textStyle.fontId === font.id
                          ? 'bg-blue-50 border-l-2 border-blue-500'
                          : ''
                      }`}
                      onClick={() => handleFontSelect(font.id)}
                    >
                      {/* 字体名称 */}
                      <span
                        className="text-sm flex-1"
                        style={{ fontFamily: font.cssFamily }}
                      >
                        {font.name}
                      </span>

                      {/* 标签 */}
                      {font.isStandard ? (
                        <span className="badge badge-standard">标准</span>
                      ) : (
                        <span className="badge badge-local">本地</span>
                      )}
                    </button>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        {/* 遮罩层 (点击外部关闭) */}
        {isFontDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsFontDropdownOpen(false);
              setFontSearchTerm('');
            }}
          />
        )}

        {/* 字体大小 */}
        <select
          value={textStyle.fontSize}
          onChange={(e) => onTextStyleChange({ fontSize: parseInt(e.target.value) })}
          className="select-input"
          title="字体大小"
        >
          {[12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>

        {/* 颜色选择器 */}
        <input
          type="color"
          value={textStyle.color}
          onChange={(e) => onTextStyleChange({ color: e.target.value })}
          className="color-input"
          title="文字颜色"
        />

        {/* 粗体 */}
        <button
          onClick={() =>
            onTextStyleChange({
              fontWeight: textStyle.fontWeight === 'bold' ? 'normal' : 'bold',
            })
          }
          className={`btn btn-ghost btn-icon ${textStyle.fontWeight === 'bold' ? 'active' : ''}`}
          title="粗体"
          style={{ fontWeight: 'bold' }}
        >
          B
        </button>

        {/* 斜体 */}
        <button
          onClick={() =>
            onTextStyleChange({
              fontStyle: textStyle.fontStyle === 'italic' ? 'normal' : 'italic',
            })
          }
          className={`btn btn-ghost btn-icon ${textStyle.fontStyle === 'italic' ? 'active' : ''}`}
          title="斜体"
          style={{ fontStyle: 'italic' }}
        >
          I
        </button>

        <div className="toolbar-divider" />

        {/* 缩放控制 */}
        <button onClick={onZoomOut} className="btn btn-ghost btn-icon" title="缩小">
          <Minus size={18} />
        </button>

        <button
          onClick={onResetZoom}
          className="btn btn-ghost"
          title="重置缩放"
          style={{ minWidth: '70px' }}
        >
          {Math.round(scale * 100)}%
        </button>

        <button onClick={onZoomIn} className="btn btn-ghost btn-icon" title="放大">
          <Plus size={18} />
        </button>
      </div>

      {/* 颜色选择弹窗 */}
      <ColorPickerModal
        isOpen={isColorPickerOpen}
        currentColor={pickedColor || brushSettings.color}
        onClose={() => {
          console.log('❌ 取消颜色选择');
          setIsColorPickerOpen(false);
        }}
        onConfirm={(color) => {
          console.log('✅ 确认颜色:', color);
          console.log('🔄 切换到画笔工具');
          onBrushSettingsChange({ color });
          onToolChange(EditorTool.BRUSH);
          setIsColorPickerOpen(false);
        }}
      />

      {/* 取色提示 */}
      {isPickingColor && (
        <div className="color-picking-hint">
          <Paintbrush size={16} />
          <span>点击 PDF 页面任意位置进行取色</span>
        </div>
      )}
    </div>
  );
};
