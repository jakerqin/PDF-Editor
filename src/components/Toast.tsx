import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <AlertCircle size={20} />,
  };

  const colors = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '#10b981' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '#ef4444' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '#f59e0b' },
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: '#3b82f6' },
  };

  const color = colors[type];

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s ease',
        maxWidth: '400px',
      }}
    >
      <span style={{ color: color.icon, flexShrink: 0 }}>{icons[type]}</span>
      <span style={{ color: color.text, fontSize: '14px', fontWeight: 500 }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          marginLeft: '8px',
          color: color.text,
          opacity: 0.6,
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Toast 管理器
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let setToastsExternal: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;

export const toast = {
  success: (message: string) => {
    if (setToastsExternal) {
      setToastsExternal((prev) => [...prev, { id: ++toastId, message, type: 'success' }]);
    }
  },
  error: (message: string) => {
    if (setToastsExternal) {
      setToastsExternal((prev) => [...prev, { id: ++toastId, message, type: 'error' }]);
    }
  },
  warning: (message: string) => {
    if (setToastsExternal) {
      setToastsExternal((prev) => [...prev, { id: ++toastId, message, type: 'warning' }]);
    }
  },
  info: (message: string) => {
    if (setToastsExternal) {
      setToastsExternal((prev) => [...prev, { id: ++toastId, message, type: 'info' }]);
    }
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    setToastsExternal = setToasts;
    return () => {
      setToastsExternal = null;
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {toasts.map((t, index) => (
        <div key={t.id} style={{ position: 'fixed', top: `${80 + index * 70}px`, right: '24px', zIndex: 9999 }}>
          <Toast
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        </div>
      ))}
    </>
  );
};

export default Toast;

