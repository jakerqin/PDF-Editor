import { useState, useCallback } from 'react';
import {
  EditorState,
  EditorTool,
  EditOperation,
  TextStyle,
  BrushSettings,
} from '../types/editor.types';
import { generateEditedPDF, downloadPDF } from '../utils/pdfGenerator';
import { DEFAULT_FONT_ID } from '../utils/fontManager';

const defaultTextStyle: TextStyle = {
  fontId: DEFAULT_FONT_ID,
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  color: '#000000',
  align: 'left',
};

const defaultBrushSettings: BrushSettings = {
  color: '#FFFFFF', // 默认白色
  strokeWidth: 20, // 默认粗细
};

export function useEditor() {
  const [editorState, setEditorState] = useState<EditorState>({
    operations: [],
    selectedObjectId: null,
    tool: EditorTool.SELECT,
    textStyle: defaultTextStyle,
    brushSettings: defaultBrushSettings,
  });

  /**
   * 设置当前工具
   */
  const setTool = useCallback((tool: EditorTool) => {
    setEditorState((prev) => ({ ...prev, tool }));
  }, []);

  /**
   * 添加或更新编辑操作
   * 如果操作 ID 已存在则更新，否则添加
   */
  const addOperation = useCallback((operation: EditOperation) => {
    setEditorState((prev) => {
      const existingIndex = prev.operations.findIndex(op => op.id === operation.id);
      if (existingIndex >= 0) {
        // 更新现有操作
        const newOperations = [...prev.operations];
        newOperations[existingIndex] = operation;
        return { ...prev, operations: newOperations };
      } else {
        // 添加新操作
        return { ...prev, operations: [...prev.operations, operation] };
      }
    });
  }, []);

  /**
   * 更新编辑操作
   */
  const updateOperation = useCallback(
    (operationId: string, updates: Partial<EditOperation>) => {
      setEditorState((prev) => ({
        ...prev,
        operations: prev.operations.map((op) =>
          op.id === operationId ? ({ ...op, ...updates } as EditOperation) : op
        ),
      }));
    },
    []
  );

  /**
   * 删除编辑操作
   */
  const removeOperation = useCallback((operationId: string) => {
    setEditorState((prev) => ({
      ...prev,
      operations: prev.operations.filter((op) => op.id !== operationId),
    }));
  }, []);

  /**
   * 设置选中对象
   */
  const setSelectedObject = useCallback((objectId: string | null) => {
    setEditorState((prev) => ({ ...prev, selectedObjectId: objectId }));
  }, []);

  /**
   * 更新文本样式
   */
  const updateTextStyle = useCallback((style: Partial<TextStyle>) => {
    setEditorState((prev) => ({
      ...prev,
      textStyle: { ...prev.textStyle, ...style },
    }));
  }, []);

  /**
   * 更新画笔设置
   */
  const updateBrushSettings = useCallback((settings: Partial<BrushSettings>) => {
    setEditorState((prev) => ({
      ...prev,
      brushSettings: { ...prev.brushSettings, ...settings },
    }));
  }, []);

  /**
   * 获取当前页的操作
   */
  const getPageOperations = useCallback(
    (pageNumber: number): EditOperation[] => {
      return editorState.operations.filter(
        (op) => op.pageNumber === pageNumber
      );
    },
    [editorState.operations]
  );

  /**
   * 撤销最后一个操作
   */
  const undo = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      operations: prev.operations.slice(0, -1),
    }));
  }, []);

  /**
   * 清空所有操作
   */
  const clearAll = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      operations: [],
      selectedObjectId: null,
    }));
  }, []);

  /**
   * 导出编辑后的 PDF
   */
  const exportPDF = useCallback(
    async (
      originalFile: File,
      pageHeight: number,
      fileName: string = 'edited.pdf'
    ) => {
      try {
        const pdfBytes = await generateEditedPDF(
          originalFile,
          editorState.operations,
          pageHeight
        );
        downloadPDF(pdfBytes, fileName);
        return true;
      } catch (err) {
        console.error('导出 PDF 失败:', err);
        return false;
      }
    },
    [editorState.operations]
  );

  return {
    editorState,
    setTool,
    addOperation,
    updateOperation,
    removeOperation,
    setSelectedObject,
    updateTextStyle,
    updateBrushSettings,
    getPageOperations,
    undo,
    clearAll,
    exportPDF,
  };
}

