import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface ColorPickerModalProps {
  isOpen: boolean;
  currentColor: string;
  onClose: () => void;
  onConfirm: (color: string) => void;
}

const PRESET_COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '米色', value: '#F5F5DC' },
  { name: '浅灰', value: '#E5E5E5' },
  { name: '灰色', value: '#D3D3D3' },
  { name: '深灰', value: '#808080' },
  { name: '黑色', value: '#000000' },
  { name: '红色', value: '#FF0000' },
  { name: '蓝色', value: '#0000FF' },
  { name: '绿色', value: '#00FF00' },
  { name: '黄色', value: '#FFFF00' },
];

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  currentColor,
  onClose,
  onConfirm,
}) => {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [customColor, setCustomColor] = useState(currentColor);

  // 当 modal 打开或 currentColor 改变时，更新 state
  useEffect(() => {
    if (isOpen) {
      setSelectedColor(currentColor);
      setCustomColor(currentColor);
    }
  }, [isOpen, currentColor]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedColor);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">选择背景颜色</h3>
        </div>

        <div className="modal-body">
          {/* 预设颜色 */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
              预设颜色
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '10px',
              }}
            >
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className="color-swatch"
                  style={{
                    backgroundColor: color.value,
                    border:
                      selectedColor === color.value
                        ? '3px solid var(--color-primary)'
                        : '2px solid var(--color-border)',
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                  title={color.name}
                >
                  {selectedColor === color.value && (
                    <Check
                      size={24}
                      color={color.value === '#FFFFFF' || color.value === '#F5F5DC' ? '#000' : '#FFF'}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义颜色 */}
          <div>
            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
              自定义颜色
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setSelectedColor(e.target.value);
                }}
                className="color-input"
                style={{ width: '60px', height: '40px' }}
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setSelectedColor(e.target.value);
                }}
                className="input"
                placeholder="#FFFFFF"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* 颜色预览 */}
          <div style={{ marginTop: '20px' }}>
            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
              当前选择
            </label>
            <div
              style={{
                backgroundColor: selectedColor,
                border: '2px solid var(--color-border)',
                borderRadius: '8px',
                height: '60px',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">
            取消
          </button>
          <button onClick={handleConfirm} className="btn btn-primary">
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

