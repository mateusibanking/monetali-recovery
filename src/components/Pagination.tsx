import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground">
        {start}–{end} de {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium px-3">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
