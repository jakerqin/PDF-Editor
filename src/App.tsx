import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { PDFViewer } from './components/PDFViewer';
import { ToastContainer, toast } from './components/Toast';
import { usePDFDocument } from './hooks/usePDFDocument';
import { useEditor } from './hooks/useEditor';
import { registerCSSFonts } from './utils/fontManager';

function App() {
  // 统一在 App 层管理所有状态
  const pdfDocument = usePDFDocument();
  const editor = useEditor();

  // 字体加载状态
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontLoading, setFontLoading] = useState(true);

  // 取色状态
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);

  // 加载字体
  useEffect(() => {
    const loadFonts = async () => {
      try {
        console.log('🔄 正在加载字体...');
        await registerCSSFonts();
        setFontsLoaded(true);
        console.log('✅ 字体加载完成');
        setFontLoading(false);
      } catch (error) {
        console.error('❌ 字体加载失败:', error);
        setFontLoading(false);
        // 字体加载失败不影响主要功能，继续运行
      }
    };

    loadFonts();
  }, []);

  const handleExport = async () => {
    if (!pdfDocument.documentState.file || !pdfDocument.currentPageRenderInfo) {
      toast.warning('请先打开 PDF 文件');
      return;
    }

    toast.info('正在导出 PDF...');

    const success = await editor.exportPDF(
      pdfDocument.documentState.file,
      pdfDocument.currentPageRenderInfo.viewport.height,
      'edited-document.pdf'
    );

    if (success) {
      toast.success('PDF 导出成功！');
    } else {
      toast.error('PDF 导出失败，请重试');
    }
  };

  const handleStartColorPicking = () => {
    if (!pdfDocument.documentState.file) {
      toast.warning('请先打开 PDF 文件');
      return;
    }
    console.log('🎯 开始取色模式');
    setIsPickingColor(true);
    setPickedColor(null);
  };

  const handleColorPicked = (color: string) => {
    console.log('🎨 取色完成, 颜色:', color);
    setPickedColor(color);
    setIsPickingColor(false);
  };

  return (
    <div className="app-container">
      {/* Toast 通知容器 */}
      <ToastContainer />

      {/* 字体加载遮罩 */}
      {fontLoading && (
        <div className="font-loading-overlay">
          <div className="font-loading-content">
            <div className="loading-spinner"></div>
            <p>正在加载字体...</p>
          </div>
        </div>
      )}

      {/* 顶部工具栏 */}
      <Toolbar
        currentTool={editor.editorState.tool}
        textStyle={editor.editorState.textStyle}
        brushSettings={editor.editorState.brushSettings}
        canUndo={editor.editorState.operations.length > 0}
        isPickingColor={isPickingColor}
        pickedColor={pickedColor}
        onToolChange={editor.setTool}
        onTextStyleChange={editor.updateTextStyle}
        onBrushSettingsChange={editor.updateBrushSettings}
        onStartColorPicking={handleStartColorPicking}
        onUploadPDF={pdfDocument.loadPDF}
        onExportPDF={handleExport}
        onUndo={editor.undo}
        onZoomIn={pdfDocument.zoomIn}
        onZoomOut={pdfDocument.zoomOut}
        onResetZoom={pdfDocument.resetZoom}
        scale={pdfDocument.documentState.scale}
      />

      {/* 主 PDF 查看器区域 - 传递所有需要的状态和函数 */}
      <PDFViewer
        documentState={pdfDocument.documentState}
        currentPageRenderInfo={pdfDocument.currentPageRenderInfo}
        isLoading={pdfDocument.isLoading}
        error={pdfDocument.error}
        loadPDF={pdfDocument.loadPDF}
        previousPage={pdfDocument.previousPage}
        nextPage={pdfDocument.nextPage}
        goToPage={pdfDocument.goToPage}
        editorState={editor.editorState}
        addOperation={editor.addOperation}
        removeOperation={editor.removeOperation}
        setSelectedObject={editor.setSelectedObject}
        setTool={editor.setTool}
        isPickingColor={isPickingColor}
        onColorPicked={handleColorPicked}
      />
    </div>
  );
}

export default App;
