import { Download, Loader2, ChevronDown } from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  testId?: string;
  projectId?: string;
  className?: string;
}

export function ExportButton({ testId, projectId, className }: ExportButtonProps) {
  const { triggerExport, isExporting } = useExport();

  const handleExport = async (format: 'CSV' | 'XLSX') => {
    // Close dropdown by blurring active element
    (document.activeElement as HTMLElement)?.blur();
    await triggerExport({ testId, projectId, format });
  };

  return (
    <div className={cn('dropdown dropdown-end', className)}>
      <div
        tabIndex={0}
        role="button"
        className="btn btn-primary btn-sm gap-2"
        aria-disabled={isExporting}
      >
        {isExporting
          ? <Loader2 size={16} className="animate-spin" />
          : <Download size={16} />}
        {isExporting ? 'Exporting…' : 'Export'}
        <ChevronDown size={14} />
      </div>
      <ul tabIndex={0} className="dropdown-content menu bg-base-200 rounded-box shadow-xl z-50 p-2 w-40">
        <li><button onClick={() => handleExport('CSV')}>CSV</button></li>
        <li><button onClick={() => handleExport('XLSX')}>Excel (XLSX)</button></li>
      </ul>
    </div>
  );
}
