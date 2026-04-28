import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../../context/LanguageContext";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData?: {
    apiData: any;
    unprocessedCount: number;
    mitigationRate: number;
    categoryChartData: Array<{ name: string; value: number }>;
    financialImpactData: Array<{ name: string; impact: number }>;
    lastUpdated: Date;
  };
}

export function ExportModal({ open, onOpenChange, reportData }: ExportModalProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'json' | 'csv'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const generateDate = () => new Date().toISOString().split('T')[0];

  const buildCsvContent = () => {
    if (!reportData) return '';

    const lines: string[] = [];

    // Section 1: Overview
    lines.push('# Security Report Overview');
    lines.push('');
    lines.push('Metric,Value');
    lines.push('Total Risks,' + reportData.unprocessedCount);
    lines.push('Critical Threats,' + (reportData.apiData?.critical_threats ?? 'N/A'));
    lines.push('Financial Exposure,' + (reportData.apiData?.financial_exposure ?? 'N/A'));
    lines.push('Mitigation Rate,' + reportData.mitigationRate + '%');
    lines.push('Last Updated,' + reportData.lastUpdated.toLocaleString());

    // Section 2: Category Distribution
    lines.push('');
    lines.push('# Category Distribution');
    lines.push('');
    lines.push('Category,Count');
    for (const item of reportData.categoryChartData) {
      lines.push(item.name + ',' + item.value);
    }

    // Section 3: Financial Impact
    lines.push('');
    lines.push('# Financial Impact by Risk');
    lines.push('');
    lines.push('Risk,Amount');
    for (const item of reportData.financialImpactData) {
      lines.push(item.name + ',' + item.impact);
    }

    return lines.join('\n');
  };

  const handleExport = async () => {
    if (!reportData) return;

    setIsExporting(true);

    try {
      const date = generateDate();
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify(reportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        content = buildCsvContent();
        mimeType = 'text/csv';
        extension = 'csv';
      }

      const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `soc_report_${date}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onOpenChange(false);

      // Optional toast notification
      if (typeof window !== 'undefined' && (window as any).sonner) {
        const { toast } = (window as any).sonner;
        toast(t('exportModal.success', 'Report downloaded successfully'));
      }
    } catch (error) {
      console.error('Помилка генерації звіту:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            {t('exportModal.title', 'Export Security Report')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('exportModal.description', 'Download a comprehensive report of current security metrics, financial exposure, and risk distribution.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-popover-foreground">{t('exportModal.format', 'File Format')}</label>
            <RadioGroup
              value={format}
              onValueChange={(value) => {
                if (value === 'json' || value === 'csv') setFormat(value);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Report Options Summary */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-sm text-popover-foreground mb-2">{t('exportModal.report_summary', 'Report Summary')}</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• {t('exportModal.matrix_data', 'Risk Assessment Matrix Data')}</li>
              <li>• {t('exportModal.threats_analysis', 'Critical Threats Analysis')}</li>
              <li>• {t('exportModal.financial_impact', 'Estimated Financial Impact')}</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isExporting}>
            {t('exportModal.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="flex-1 bg-primary text-primary-foreground">
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            {isExporting ? 'Generating...' : t('exportModal.download', 'Download Report')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}