import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onPreviousPage,
  onNextPage,
}) => {
  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="page-navigation">
      {/* 上一页按钮 */}
      <button
        onClick={onPreviousPage}
        disabled={currentPage <= 1}
        className="nav-btn"
        title="上一页"
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <ChevronLeft size={16} />
        <span>上一页</span>
      </button>

      {/* 页码显示 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="page-text">第</span>
        <input
          type="number"
          value={currentPage}
          onChange={handlePageInput}
          min={1}
          max={totalPages}
          className="page-input"
        />
        <span className="page-text">/ {totalPages} 页</span>
      </div>

      {/* 下一页按钮 */}
      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        className="nav-btn"
        title="下一页"
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <span>下一页</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
