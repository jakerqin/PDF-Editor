import React, { useEffect, useRef, useState } from 'react';

interface ColorPickerCursorProps {
  sourceCanvas: HTMLCanvasElement | null;
  x: number;
  y: number;
  onColorPick: (color: string) => void;
}

export const ColorPickerCursor: React.FC<ColorPickerCursorProps> = ({
  sourceCanvas,
  x,
  y,
  onColorPick,
}) => {
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentColor, setCurrentColor] = useState<string>('#000000');

  useEffect(() => {
    if (!sourceCanvas || !cursorCanvasRef.current) return;

    const canvas = cursorCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 取色器参数
    const cursorSize = 120; // 圆圈大小
    const centerX = cursorSize / 2;
    const centerY = cursorSize / 2;
    const captureSize = 20; // 捕获区域大小
    const zoomLevel = 10; // 放大倍数

    // 确保坐标在 canvas 范围内
    const clampedX = Math.max(0, Math.min(sourceCanvas.width - 1, Math.floor(x)));
    const clampedY = Math.max(0, Math.min(sourceCanvas.height - 1, Math.floor(y)));
    
    // 计算捕获区域的起始位置（确保鼠标位置在中心）
    const halfCapture = Math.floor(captureSize / 2);
    const sourceX = Math.max(0, Math.min(sourceCanvas.width - captureSize, clampedX - halfCapture));
    const sourceY = Math.max(0, Math.min(sourceCanvas.height - captureSize, clampedY - halfCapture));
    
    // 计算鼠标在捕获区域内的相对位置
    const relativeX = clampedX - sourceX;
    const relativeY = clampedY - sourceY;
    
    try {
      const imageData = sourceCtx.getImageData(sourceX, sourceY, captureSize, captureSize);
      
      // 放大并绘制到取色器画布
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = captureSize;
      tempCanvas.height = captureSize;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
        
        // 禁用图像平滑以显示像素化效果
        ctx.imageSmoothingEnabled = false;
        
        // 绘制放大的图像
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, cursorSize / 2 - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          tempCanvas,
          0, 0, captureSize, captureSize,
          0, 0, cursorSize, cursorSize
        );
        ctx.restore();
      }

      // 获取鼠标位置的颜色（使用相对位置）
      const pixelIndex = (relativeY * captureSize + relativeX) * 4;
      const r = imageData.data[pixelIndex];
      const g = imageData.data[pixelIndex + 1];
      const b = imageData.data[pixelIndex + 2];
      const hex = '#' + [r, g, b].map(v => {
        const hex = v.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
      
      setCurrentColor(hex);

    } catch (error) {
      console.error('取色失败:', error);
    }

    // 绘制外圈
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, cursorSize / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制白色内圈
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, cursorSize / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制中心十字线
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();

    // 绘制中心点（显示当前颜色）
    ctx.fillStyle = currentColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.stroke();

  }, [sourceCanvas, x, y, currentColor]);

  const handleClick = () => {
    onColorPick(currentColor);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 60,
        top: y - 60,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    >
      <canvas
        ref={cursorCanvasRef}
        width={120}
        height={120}
        style={{
          display: 'block',
          cursor: 'none',
        }}
      />
      {/* 颜色信息显示 */}
      <div
        style={{
          position: 'absolute',
          top: '130px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
        }}
      >
        {currentColor.toUpperCase()}
      </div>
    </div>
  );
};

