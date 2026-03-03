import { Download, Loader2 } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ExportButtonProps {
  testId?: string;
  projectId?: string;
  className?: string;
}



export function ExportButton({ testId, projectId, className }: ExportButtonProps) {
  const { triggerExport, isExporting } = useExport();
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'CSV' | 'XLSX') => {
    setShowMenu(false);
    await triggerExport({ testId, projectId, format });
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(v => !v)}
        disabled={isExporting}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg btn-gradient',
          'text-sm disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        {isExporting
          ? <Loader2 size={16} className="animate-spin" />
          : <Download size={16} />}
        {isExporting ? 'Exporting…' : 'Export'}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 glass-card py-1 min-w-[120px]">
            <button
              className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => handleExport('CSV')}
            >
              Export CSV
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => handleExport('XLSX')}
            >
              Export Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
