import React from 'react';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { EditorCanvas } from './EditorCanvas';
import { PageNavigation } from './PageNavigation';
import { PDFDocumentState, PageRenderInfo, EditorState, EditorTool } from '../types/editor.types';

interface PDFViewerProps {
  // PDF 文档状态
  documentState: PDFDocumentState;
  currentPageRenderInfo: PageRenderInfo | null;
  isLoading: boolean;
  error: string | null;
  loadPDF: (file: File) => void;
  previousPage: () => void;
  nextPage: () => void;
  goToPage: (page: number) => void;
  // 编辑器状态
  editorState: EditorState;
  addOperation: (operation: any) => void;
  removeOperation: (operationId: string) => void;
  setSelectedObject: (objectId: string | null) => void;
  setTool: (tool: EditorTool) => void;
  // 取色状态
  isPickingColor: boolean;
  onColorPicked: (color: string) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  documentState,
  currentPageRenderInfo,
  isLoading,
  error,
  loadPDF,
  previousPage,
  nextPage,
  goToPage,
  editorState,
  addOperation,
  removeOperation,
  setSelectedObject,
  setTool,
  isPickingColor,
  onColorPicked,
}) => {
  return (
    <div className="main-content">
      {/* 空状态：没有加载 PDF */}
      {!documentState.file && !isLoading && (
        <div className="welcome-container">
          <div className="welcome-icon">
            <FileText size={48} strokeWidth={1.5} />
          </div>
          <h1 className="welcome-title">PDF 编辑器</h1>
          <p className="welcome-subtitle">
            上传您的 PDF 文件，即可开始编辑文本、添加注释和图片
          </p>
          <label className="upload-btn">
            <Upload size={20} />
            <span>选择 PDF 文件</span>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadPDF(file);
              }}
              className="hidden-input"
            />
          </label>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">正在加载 PDF 文件...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="error-container">
          <AlertCircle size={48} className="error-icon" />
          <p className="error-text">{error}</p>
        </div>
      )}

      {/* PDF 查看和编辑区域 */}
      {documentState.file && currentPageRenderInfo && !isLoading && (
        <div className="pdf-viewer-container">
          <EditorCanvas
            canvas={currentPageRenderInfo.canvas}
            textItems={currentPageRenderInfo.textItems}
            currentTool={editorState.tool}
            textStyle={editorState.textStyle}
            brushSettings={editorState.brushSettings}
            pageNumber={documentState.currentPage}
            onAddOperation={addOperation}
            onRemoveOperation={removeOperation}
            onObjectSelected={setSelectedObject}
            onToolChange={setTool}
            isPickingColor={isPickingColor}
            onColorPicked={onColorPicked}
          />
        </div>
      )}

      {/* 页面导航（多页PDF时显示） */}
      {documentState.numPages > 1 && currentPageRenderInfo && (
        <PageNavigation
          currentPage={documentState.currentPage}
          totalPages={documentState.numPages}
          onPageChange={goToPage}
          onPreviousPage={previousPage}
          onNextPage={nextPage}
        />
      )}
    </div>
  );
};
