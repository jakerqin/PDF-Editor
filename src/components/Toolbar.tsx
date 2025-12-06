import React, { useRef } from 'react';
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
} from 'lucide-react';
import { EditorTool, TextStyle } from '../types/editor.types';
import { FONTS } from '../utils/fontManager';

interface ToolbarProps {
  currentTool: EditorTool;
  textStyle: TextStyle;
  canUndo: boolean;
  onToolChange: (tool: EditorTool) => void;
  onTextStyleChange: (style: Partial<TextStyle>) => void;
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
  canUndo,
  onToolChange,
  onTextStyleChange,
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
        {/* 字体选择 */}
        <select
          value={textStyle.fontId}
          onChange={(e) => onTextStyleChange({ fontId: e.target.value })}
          className="select-input font-select"
          title="选择字体"
        >
          {FONTS.map((font) => (
            <option key={font.id} value={font.id} style={{ fontFamily: font.cssFamily }}>
              {font.name}
            </option>
          ))}
        </select>

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
    </div>
  );
};
