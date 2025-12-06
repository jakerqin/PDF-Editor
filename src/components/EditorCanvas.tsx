import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  EditorTool,
  TextStyle,
  PDFTextItem,
  EditOperationType,
  MaskOperation,
  TextEditOperation,
  ImageOperation,
} from '../types/editor.types';
import { findTextAtPosition } from '../utils/pdfRenderer';
import { getFontCSSFamily } from '../utils/fontManager';

const DEFAULT_TEXT = '点击输入文字';

interface EditorCanvasProps {
  canvas: HTMLCanvasElement | null;
  textItems: PDFTextItem[];
  currentTool: EditorTool;
  textStyle: TextStyle;
  pageNumber: number;
  onAddOperation: (operation: any) => void;
  onRemoveOperation: (operationId: string) => void;
  onObjectSelected: (objectId: string | null) => void;
  onToolChange: (tool: EditorTool) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  canvas: pdfCanvas,
  textItems,
  currentTool,
  textStyle,
  pageNumber,
  onAddOperation,
  onRemoveOperation,
  onObjectSelected,
  onToolChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 初始化 Fabric.js Canvas
  useEffect(() => {
    if (!pdfCanvas || !containerRef.current) return;

    const canvasElement = document.createElement('canvas');
    canvasElement.id = 'fabric-canvas';
    canvasElement.width = pdfCanvas.width;
    canvasElement.height = pdfCanvas.height;

    // 清空容器
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(canvasElement);

    // 创建 Fabric Canvas
    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: pdfCanvas.width,
      height: pdfCanvas.height,
      backgroundColor: 'transparent',
      selection: true,
    });

    fabricCanvasRef.current = fabricCanvas;
    setIsReady(true);

    // 监听对象选择
    fabricCanvas.on('selection:created', (e: any) => {
      const obj = e.selected?.[0];
      if (obj && (obj as any).editOperationId) {
        onObjectSelected((obj as any).editOperationId);
      }
    });

    fabricCanvas.on('selection:updated', (e: any) => {
      const obj = e.selected?.[0];
      if (obj && (obj as any).editOperationId) {
        onObjectSelected((obj as any).editOperationId);
      }
    });

    fabricCanvas.on('selection:cleared', () => {
      onObjectSelected(null);
    });

    return () => {
      fabricCanvas.dispose();
      fabricCanvasRef.current = null;
      setIsReady(false);
    };
  }, [pdfCanvas, onObjectSelected]);

  // 键盘事件：删除选中对象
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const fabricCanvas = fabricCanvasRef.current;
      if (!fabricCanvas) return;

      // Delete 或 Backspace 键删除选中对象
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && (activeObject as any).editOperationId) {
          // 如果正在编辑文本，不删除
          if (activeObject instanceof fabric.IText && activeObject.isEditing) {
            return;
          }
          
          e.preventDefault();
          const operationId = (activeObject as any).editOperationId;
          
          // 从画布移除对象
          fabricCanvas.remove(activeObject);
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          
          // 通知父组件移除操作
          onRemoveOperation(operationId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRemoveOperation]);

  /**
   * 保存文本操作
   */
  const saveTextOperation = useCallback((
    textObject: fabric.IText,
    operationId: string,
    isOverlay: boolean,
    originalText?: string
  ) => {
    const operation: TextEditOperation = {
      id: operationId,
      type: isOverlay
        ? EditOperationType.OVERLAY_TEXT
        : EditOperationType.ADD_TEXT,
      pageNumber,
      text: textObject.text || '',
      x: textObject.left || 0,
      y: textObject.top || 0,
      width: textObject.width || 100,
      height: textObject.height || 20,
      style: {
        fontId: textStyle.fontId,
        fontSize: textObject.fontSize || textStyle.fontSize,
        fontWeight:
          (textObject.fontWeight as 'normal' | 'bold') || textStyle.fontWeight,
        fontStyle:
          (textObject.fontStyle as 'normal' | 'italic') || textStyle.fontStyle,
        color: (textObject.fill as string) || textStyle.color,
        align: (textObject.textAlign as 'left' | 'center' | 'right') || 'left',
      },
      originalText,
    };

    onAddOperation(operation);
  }, [pageNumber, textStyle, onAddOperation]);

  /**
   * 添加新文本
   */
  const addNewText = useCallback((x: number, y: number) => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    const operationId = `text-${Date.now()}`;

    const textObject = new fabric.IText(DEFAULT_TEXT, {
      left: x,
      top: y,
      fontFamily: getFontCSSFamily(textStyle.fontId),
      fontSize: textStyle.fontSize,
      fill: textStyle.color,
      fontWeight: textStyle.fontWeight,
      fontStyle: textStyle.fontStyle,
      editable: true,
    });

    (textObject as any).editOperationId = operationId;
    (textObject as any).isEditOperation = true;
    (textObject as any).isNewText = true; // 标记为新创建的文本

    fabricCanvas.add(textObject);
    fabricCanvas.setActiveObject(textObject);
    
    // 进入编辑模式
    textObject.enterEditing();
    
    // 选中全部文本
    textObject.selectAll();

    // 监听文本变化，当用户开始输入时清空默认文本
    const handleTextChanged = () => {
      if ((textObject as any).isNewText && textObject.text !== DEFAULT_TEXT) {
        // 用户已经开始输入，移除标记
        (textObject as any).isNewText = false;
      }
    };

    // 监听编辑开始事件
    textObject.on('editing:entered', () => {
      if ((textObject as any).isNewText) {
        // 选中全部文本，方便用户直接输入替换
        setTimeout(() => {
          textObject.selectAll();
        }, 0);
      }
    });

    // 监听文本内容变化
    (textObject as any).on('changed', handleTextChanged);

    // 监听文本修改（移动、缩放等）
    textObject.on('modified', () => {
      saveTextOperation(textObject, operationId, false);
    });

    // 监听编辑退出，保存最终文本
    textObject.on('editing:exited', () => {
      // 如果文本为空或仍为默认文本，删除该文本框
      if (!textObject.text || textObject.text.trim() === '' || textObject.text === DEFAULT_TEXT) {
        fabricCanvas.remove(textObject);
        onRemoveOperation(operationId);
      } else {
        saveTextOperation(textObject, operationId, false);
      }
    });

    // 切换到选择工具（但保持当前文本框的编辑状态）
    onToolChange(EditorTool.SELECT);

    // 初始保存
    saveTextOperation(textObject, operationId, false);
  }, [
    textStyle.fontId,
    textStyle.fontSize,
    textStyle.fontWeight,
    textStyle.fontStyle,
    textStyle.color,
    saveTextOperation,
    onToolChange,
    onRemoveOperation
  ]);

  /**
   * 编辑现有文本（覆盖式）
   */
  const editExistingText = useCallback((x: number, y: number) => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    // 调试：打印点击位置和可用文本
    console.log('=== 编辑文本调试 ===');
    console.log('点击位置:', { x, y });
    console.log('可用文本数量:', textItems.length);
    if (textItems.length > 0) {
      console.log('前5个文本项:', textItems.slice(0, 5).map(t => ({
        str: t.str,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height
      })));
    }

    // 查找点击位置的文本
    const textItem = findTextAtPosition(textItems, x, y);
    console.log('找到的文本:', textItem);
    console.log('========================');
    
    if (!textItem) return;

    const operationId = `overlay-${Date.now()}`;

    // 1. 创建白色遮罩矩形
    const maskRect = new fabric.Rect({
      left: textItem.x,
      top: textItem.y,
      width: textItem.width,
      height: textItem.height,
      fill: 'white',
      selectable: false,
      evented: false,
    });

    fabricCanvas.add(maskRect);

    // 保存遮罩操作
    const maskOperation: MaskOperation = {
      id: `mask-${operationId}`,
      type: EditOperationType.ADD_MASK,
      pageNumber,
      x: textItem.x,
      y: textItem.y,
      width: textItem.width,
      height: textItem.height,
    };
    onAddOperation(maskOperation);

    // 2. 在遮罩上方创建可编辑文本
    const textObject = new fabric.IText(textItem.str, {
      left: textItem.x,
      top: textItem.y,
      fontFamily: getFontCSSFamily(textStyle.fontId),
      fontSize: textItem.fontSize,
      fill: textStyle.color,
      fontWeight: textStyle.fontWeight,
      fontStyle: textStyle.fontStyle,
      editable: true,
    });

    (textObject as any).editOperationId = operationId;
    (textObject as any).isEditOperation = true;
    (textObject as any).originalText = textItem.str;
    (textObject as any).maskRect = maskRect; // 关联遮罩，便于删除时一起删除

    fabricCanvas.add(textObject);
    fabricCanvas.setActiveObject(textObject);
    textObject.enterEditing();

    // 监听文本修改
    textObject.on('modified', () => {
      saveTextOperation(textObject, operationId, true, textItem.str);
    });

    // 监听编辑退出
    textObject.on('editing:exited', () => {
      saveTextOperation(textObject, operationId, true, textItem.str);
    });

    // 初始保存
    saveTextOperation(textObject, operationId, true, textItem.str);
  }, [
    textItems,
    textStyle.fontId,
    textStyle.fontSize,
    textStyle.fontWeight,
    textStyle.fontStyle,
    textStyle.color,
    pageNumber,
    onAddOperation,
    saveTextOperation
  ]);

  // 处理点击事件
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas || !isReady) return;

    const handleCanvasClick = (e: any) => {
      // 如果点击的是已有对象，不处理
      if (e.target) return;
      
      const pointer = fabricCanvas.getPointer(e.e);

      if (currentTool === EditorTool.TEXT) {
        // 添加新文本
        addNewText(pointer.x, pointer.y);
      } else if (currentTool === EditorTool.EDIT_TEXT) {
        // 编辑现有文本
        editExistingText(pointer.x, pointer.y);
      }
    };

    fabricCanvas.on('mouse:down', handleCanvasClick);

    return () => {
      fabricCanvas.off('mouse:down', handleCanvasClick);
    };
  }, [isReady, currentTool, addNewText, editExistingText]);

  /**
   * 保存图片操作
   */
  const saveImageOperation = useCallback((imgObject: any, operationId: string) => {
    const operation: ImageOperation = {
      id: operationId,
      type: EditOperationType.ADD_IMAGE,
      pageNumber,
      imageData: imgObject._element?.src || '',
      x: imgObject.left || 0,
      y: imgObject.top || 0,
      width: (imgObject.width || 0) * (imgObject.scaleX || 1),
      height: (imgObject.height || 0) * (imgObject.scaleY || 1),
      rotation: imgObject.angle || 0,
    };

    onAddOperation(operation);
  }, [pageNumber, onAddOperation]);

  /**
   * 添加图片
   */
  const addImage = useCallback((imageUrl: string) => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    // 使用 Fabric.js v6 的新 API
    fabric.FabricImage.fromURL(imageUrl).then((img: any) => {
      const operationId = `image-${Date.now()}`;

      img.scale(0.5);
      img.set({
        left: 100,
        top: 100,
      });

      (img as any).editOperationId = operationId;
      (img as any).isEditOperation = true;

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);

      // 保存图片操作
      img.on('modified', () => {
        saveImageOperation(img, operationId);
      });

      saveImageOperation(img, operationId);
    }).catch((err: any) => {
      console.error('加载图片失败:', err);
    });
  }, [saveImageOperation]);

  // 导出 addImage 方法供外部使用
  useEffect(() => {
    if (isReady) {
      (window as any).addImageToCanvas = addImage;
    }
  }, [isReady, addImage]);

  // 获取 canvas 尺寸
  const canvasWidth = pdfCanvas?.width || 0;
  const canvasHeight = pdfCanvas?.height || 0;

  return (
    <div 
      className="pdf-canvas-wrapper"
      style={{ 
        position: 'relative',
        width: canvasWidth,
        height: canvasHeight,
      }}
    >
      {/* PDF 背景层 */}
      {pdfCanvas && (
        <canvas
          ref={(ref) => {
            if (ref && pdfCanvas) {
              const ctx = ref.getContext('2d');
              if (ctx) {
                ref.width = pdfCanvas.width;
                ref.height = pdfCanvas.height;
                ctx.drawImage(pdfCanvas, 0, 0);
              }
            }
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}

      {/* Fabric.js 编辑层 */}
      <div 
        ref={containerRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
};
