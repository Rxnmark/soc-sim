import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<string>("pdf");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(new Date(2026, 1, 1));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date(2026, 2, 6));
  const [isExporting, setIsExporting] = useState(false); // Додаємо стан завантаження

  const handleDownload = async () => {
    setIsExporting(true);

    try {
      // 1. Отримуємо реальні дані з нашого бекенду
      const res = await fetch("http://127.0.0.1:8000/api/v1/business-risks");
      const data = await res.json();

      if (exportFormat === "excel") {
        // 2. Формуємо CSV-таблицю для Excel
        const headers = ["Risk ID", "Title", "Category", "Probability (1-5)", "Impact (1-5)", "Status", "Est. Financial Loss ($)"];
        const csvRows = [headers.join(",")]; // Перший рядок — заголовки

        data.forEach((risk: any) => {
          const estLoss = risk.impact * 750000; // Проста оцінка для звіту
          // Беремо назву в лапки, щоб можливі коми в тексті не зламали таблицю
          csvRows.push([
            risk.id,
            `"${risk.title}"`,
            risk.category,
            risk.probability,
            risk.impact,
            risk.status,
            estLoss
          ].join(","));
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        
        // 3. Тригеримо завантаження файлу в браузері
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Risk_Assessment_Report_${format(new Date(), "yyyy-MM-dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else {
        // ІМІТАЦІЯ PDF: Віддаємо простий текстовий файл
        const textContent = `=======================================\nENTERPRISE RISK MANAGEMENT REPORT\nGenerated: ${format(new Date(), "yyyy-MM-dd")}\n=======================================\n\nTOTAL RISKS DETECTED: ${data.length}\n\n` + 
          data.map((r: any) => `[${r.status.toUpperCase()}] ${r.title}\nCategory: ${r.category} | Probability: ${r.probability}/5 | Impact: ${r.impact}/5\n`).join("\n") +
          `\n=======================================\n* Note: Full PDF rendering engine not yet connected.`;
          
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Risk_Report_${format(new Date(), "yyyy-MM-dd")}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Невелика затримка для красивої анімації завантаження
      setTimeout(() => {
        setIsExporting(false);
        onOpenChange(false);
      }, 600);

    } catch (error) {
      console.error("Помилка генерації звіту:", error);
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export Reports
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select format and date range for your risk analysis report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-popover-foreground">Export Format</label>
            <ToggleGroup
              type="single"
              value={exportFormat}
              onValueChange={(value) => value && setExportFormat(value)}
              className="justify-start gap-3"
            >
              <ToggleGroupItem
                value="pdf"
                aria-label="Export as PDF"
                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <FileDown className="w-4 h-4 mr-2" />
                TXT Document
              </ToggleGroupItem>
              <ToggleGroupItem
                value="excel"
                aria-label="Export as Excel"
                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Excel (CSV)
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-3">
            <label className="text-popover-foreground">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Report Options Summary */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-sm text-popover-foreground mb-2">Report Summary</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Risk Assessment Matrix Data</li>
              <li>• Critical Threats Analysis</li>
              <li>• Estimated Financial Impact</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={isExporting} className="flex-1 bg-primary text-primary-foreground">
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            {isExporting ? "Generating..." : "Download Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}