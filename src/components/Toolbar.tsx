import React, { useRef, useState } from 'react';
import {
  FileUp,
  Download,
  MousePointer2,
  Type,
  Pencil,
  Image,
  Undo2,
  Minus,
  Plus,
  Paintbrush,
  ChevronDown,
  ChevronUp,
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
          setFonts(getAllFonts());
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

  // 切换下拉框
  const handleToggleDropdown = () => {
    if (!isFontDropdownOpen) {
      // 打开：清空搜索内容
      setFontSearchTerm('');
    }
    setIsFontDropdownOpen(!isFontDropdownOpen);

    // 打开时聚焦输入框
    if (!isFontDropdownOpen) {
      setTimeout(() => {
        fontInputRef.current?.focus();
        fontInputRef.current?.select();
      }, 0);
    }
  };

  // 输入框聚焦时打开下拉框（但不清空内容）
  const handleInputFocus = () => {
    if (!isFontDropdownOpen) {
      setIsFontDropdownOpen(true);
    }
  };

  // 输入框内容变化时实时搜索
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFontSearchTerm(e.target.value);
    // 如果下拉框未打开，则打开它
    if (!isFontDropdownOpen) {
      setIsFontDropdownOpen(true);
    }
  };

  // 选择字体
  const handleFontSelect = (fontId: string) => {
    onTextStyleChange({ fontId });
    setIsFontDropdownOpen(false);
    setFontSearchTerm(''); // 清空搜索词，让输入框显示字体名称
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
          onClick={() => onToolChange(EditorTool.EDIT_TEXT)}
          className={`btn btn-ghost btn-icon ${currentTool === EditorTool.EDIT_TEXT ? 'active' : ''}`}
          title="编辑文本"
        >
          <Pencil size={18} />
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

        {/* 字体选择 (输入框 + 下拉框) */}
        <div className="font-select-container" style={{ width: '160px', flexShrink: 0 }}>
          {/* 输入框容器 */}
          <div className="flex items-center border border-gray-300 rounded overflow-hidden">
            {/* 输入框 */}
            <input
              ref={fontInputRef}
              type="text"
              className="flex-1 px-2 py-1.5 text-sm outline-none"
              style={{
                width: '140px',
                fontFamily: !isFontDropdownOpen && textStyle.fontId
                  ? fonts.find(f => f.id === textStyle.fontId)?.cssFamily
                  : 'inherit'
              }}
              value={
                isFontDropdownOpen
                  ? fontSearchTerm
                  : fonts.find(f => f.id === textStyle.fontId)?.name || '选择字体'
              }
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="搜索字体..."
              disabled={isLoadingFonts}
            />

            {/* 箭头按钮 */}
            <button
              className="px-2 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors border-l border-gray-300"
              onClick={handleToggleDropdown}
              disabled={isLoadingFonts}
              title={isFontDropdownOpen ? '收起' : '展开'}
            >
              {isFontDropdownOpen ? (
                <ChevronUp size={16} className="text-gray-600" />
              ) : (
                <ChevronDown size={16} className="text-gray-600" />
              )}
            </button>
          </div>

          {/* 下拉框 */}
          {isFontDropdownOpen && (
            <div
              className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-y-auto"
              style={{
                width: '256px',
                maxHeight: '300px',
                zIndex: 9999
              }}
            >
              {/* 字体列表 (平铺，无分组) */}
              <div>
                {(() => {
                  // 过滤字体
                  const filteredFonts = fonts.filter(font =>
                    font.name.toLowerCase().includes(fontSearchTerm.toLowerCase())
                  );

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
                      className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between group ${textStyle.fontId === font.id
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
