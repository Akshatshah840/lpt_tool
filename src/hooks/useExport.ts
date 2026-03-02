import { useState } from 'react';
import { useAmplifyData } from './useAmplifyData';

interface ExportOptions {
  testId?: string;
  projectId?: string;
  format: 'CSV' | 'XLSX';
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useAmplifyData();

  async function triggerExport(options: ExportOptions) {
    setIsExporting(true);
    setError(null);
    try {
      const result = await client.mutations.exportResults({
        testId: options.testId,
        projectId: options.projectId,
        format: options.format,
      });

      const data = result?.data as { downloadUrl: string } | null;
      if (!data?.downloadUrl || data.downloadUrl === '#mock-export') {
        // Mock mode — just show an alert
        alert(`[Mock] Export ${options.format} triggered. In production this downloads a real file.`);
        return;
      }

      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.setAttribute('download', `lpt-results.${options.format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  return { triggerExport, isExporting, error };
}
