import { useState, useCallback } from 'react';
import { loadPDFDocument, renderPDFPage } from '../utils/pdfRenderer';
import { PDFDocumentState, PageRenderInfo } from '../types/editor.types';

export function usePDFDocument() {
  const [documentState, setDocumentState] = useState<PDFDocumentState>({
    file: null,
    pdfDoc: null,
    pdfJsDoc: null,
    numPages: 0,
    currentPage: 1,
    scale: 1.5,
  });

  const [currentPageRenderInfo, setCurrentPageRenderInfo] =
    useState<PageRenderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载 PDF 文件
   */
  const loadPDF = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const pdfJsDoc = await loadPDFDocument(file);

      setDocumentState({
        file,
        pdfDoc: null, // pdf-lib 文档将在导出时加载
        pdfJsDoc,
        numPages: pdfJsDoc.numPages,
        currentPage: 1,
        scale: 1.5,
      });

      // 渲染第一页
      const renderInfo = await renderPDFPage(pdfJsDoc, 1, 1.5);
      setCurrentPageRenderInfo(renderInfo);
    } catch (err) {
      console.error('加载 PDF 失败:', err);
      setError('无法加载 PDF 文件，请确保文件格式正确');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 切换到指定页码
   */
  const goToPage = useCallback(
    async (pageNumber: number) => {
      if (!documentState.pdfJsDoc) return;
      if (pageNumber < 1 || pageNumber > documentState.numPages) return;

      setIsLoading(true);
      setError(null);

      try {
        const renderInfo = await renderPDFPage(
          documentState.pdfJsDoc,
          pageNumber,
          documentState.scale
        );
        setCurrentPageRenderInfo(renderInfo);
        setDocumentState((prev) => ({ ...prev, currentPage: pageNumber }));
      } catch (err) {
        console.error('渲染页面失败:', err);
        setError('无法渲染该页面');
      } finally {
        setIsLoading(false);
      }
    },
    [documentState.pdfJsDoc, documentState.scale, documentState.numPages]
  );

  /**
   * 缩放页面
   */
  const setScale = useCallback(
    async (newScale: number) => {
      if (!documentState.pdfJsDoc) return;
      if (newScale < 0.5 || newScale > 3) return; // 限制缩放范围

      setIsLoading(true);
      setError(null);

      try {
        const renderInfo = await renderPDFPage(
          documentState.pdfJsDoc,
          documentState.currentPage,
          newScale
        );
        setCurrentPageRenderInfo(renderInfo);
        setDocumentState((prev) => ({ ...prev, scale: newScale }));
      } catch (err) {
        console.error('缩放失败:', err);
        setError('无法缩放页面');
      } finally {
        setIsLoading(false);
      }
    },
    [documentState.pdfJsDoc, documentState.currentPage]
  );

  /**
   * 上一页
   */
  const previousPage = useCallback(() => {
    if (documentState.currentPage > 1) {
      goToPage(documentState.currentPage - 1);
    }
  }, [documentState.currentPage, goToPage]);

  /**
   * 下一页
   */
  const nextPage = useCallback(() => {
    if (documentState.currentPage < documentState.numPages) {
      goToPage(documentState.currentPage + 1);
    }
  }, [documentState.currentPage, documentState.numPages, goToPage]);

  /**
   * 放大
   */
  const zoomIn = useCallback(() => {
    setScale(Math.min(documentState.scale + 0.25, 3));
  }, [documentState.scale, setScale]);

  /**
   * 缩小
   */
  const zoomOut = useCallback(() => {
    setScale(Math.max(documentState.scale - 0.25, 0.5));
  }, [documentState.scale, setScale]);

  /**
   * 重置缩放
   */
  const resetZoom = useCallback(() => {
    setScale(1.5);
  }, [setScale]);

  return {
    documentState,
    currentPageRenderInfo,
    isLoading,
    error,
    loadPDF,
    goToPage,
    setScale,
    previousPage,
    nextPage,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}

