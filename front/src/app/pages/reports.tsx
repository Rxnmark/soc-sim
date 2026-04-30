import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { ReportsCalendar } from "./reports-calendar";
import { ReportsPanel } from "./reports-panel";
import { ReportData } from "./reports-types";
import { useTranslation } from "../../context/LanguageContext";
import { FolderOpen, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { format } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { getDirectoryHandle, saveDirectoryHandle } from "../utils/reports-db";
import { NotificationsPopover } from "../components/notifications-popover";
import { useRiskData } from "./risk-management-hooks";

export default function ReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Record<string, ReportData>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const parseJsonFile = useCallback(async (content: string): Promise<ReportData | null> => {
    try {
      const data = JSON.parse(content);
      const dateStr = format(new Date(data.lastUpdated), "yyyy-MM-dd");
      return {
        apiData: data.apiData,
        unprocessedCount: data.unprocessedCount,
        mitigationRate: data.mitigationRate,
        categoryChartData: data.categoryChartData,
        financialImpactData: data.financialImpactData,
        lastUpdated: new Date(data.lastUpdated),
      };
    } catch (err) {
      console.error("parseJsonFile error:", err);
      return null;
    }
  }, []);

  const readDirectory = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setIsLoading(true);
    const newReports: Record<string, ReportData> = {};

    try {
      for await (const dirEntry of (handle as any).values()) {
        const name = dirEntry.name;
        if (name && name.endsWith(".json") && dirEntry.kind === "file") {
          const fileHandle = dirEntry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const content = await file.text();
          const reportData = await parseJsonFile(content);
          if (reportData) {
            const dateStr = format(new Date(reportData.lastUpdated), "yyyy-MM-dd");
            newReports[dateStr] = reportData;
          }
        }
      }
      setReports(newReports);
    } catch (err) {
      console.error("Помилка зчитування каталогу:", err);
    } finally {
      setIsLoading(false);
    }
  }, [parseJsonFile]);

  const handleSelectFolder = useCallback(async () => {
    try {
      // @ts-ignore showDirectoryPicker is part of Web File System Access API but not in TypeScript lib.dom.d.ts
      const handle = await window.showDirectoryPicker();
      await saveDirectoryHandle(handle);
      setDirectoryHandle(handle);
      await readDirectory(handle);
    } catch (err) {
      console.error("Помилка вибору каталогу:", err);
    }
  }, [readDirectory]);

  const handleRefresh = useCallback(async () => {
    if (directoryHandle) {
      try {
        let permission = await (directoryHandle as any).queryPermission({ mode: "read" });
        if (permission !== "granted") {
          permission = await (directoryHandle as any).requestPermission({ mode: "read" });
        }
        if (permission === "granted") {
          await readDirectory(directoryHandle);
        }
      } catch (err) {
        console.error("Помилка оновлення даних:", err);
      }
    }
  }, [directoryHandle, readDirectory]);

  useEffect(() => {
    const loadSavedDirectory = async () => {
      try {
        const savedHandle = await getDirectoryHandle();
        if (savedHandle) {
          const permission = await (savedHandle as any).queryPermission({ mode: "read" });
          if (permission === "granted") {
            setDirectoryHandle(savedHandle);
            await readDirectory(savedHandle);
          }
        }
      } catch (err) {
        console.error("Помилка завантаження збереженого каталогу:", err);
      }
    };
    loadSavedDirectory();
  }, [readDirectory]);

  const { apiData, lastUpdated, isRefreshing, unprocessedCount } = useRiskData();
  const selectedReport = selectedDate ? reports[format(selectedDate, "yyyy-MM-dd")] : null;

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-[280px] shrink-0 text-center">
              <h1 className="text-card-foreground font-semibold">{t("reports.title", "Звіти")}</h1>
              <p className="text-xs text-muted-foreground">{t("reports.subtitle", "Аналіз та візуалізація звітів кібербезпеки")}</p>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-500 font-medium">LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("riskManagement.last_updated", "Last updated")}: <span className="font-mono">{lastUpdated.toLocaleTimeString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSelectFolder}
              variant="default"
              disabled={isLoading}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              {t("reports.select_folder", "Вибрати каталог")}
            </Button>
            {directoryHandle && (
              <Button
                onClick={handleRefresh}
                variant="outline"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {t("reports.refresh_data", "Оновити дані")}
              </Button>
            )}
            <NotificationsPopover apiData={apiData} displayedLogsCount={unprocessedCount} />
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full flex gap-6">
            {/* Left column: Calendar */}
            <div className="flex-1 min-w-0">
              <ReportsCalendar
                reports={reports}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  if (selectedDate && format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")) {
                    setSelectedDate(null);
                  } else {
                    setSelectedDate(date);
                  }
                }}
                month={currentMonth}
                onMonthChange={() => { }}
                isLoading={isLoading}
              />
            </div>

            {/* Right column: Panel */}
            {selectedReport && selectedDate && (
              <div className="flex-1 min-w-0">
                <ReportsPanel
                  report={selectedReport}
                  date={selectedDate}
                  onClose={() => setSelectedDate(null)}
                />
              </div>
            )}
          </div>

          {/* No Data Message */}
          {Object.keys(reports).length === 0 && !isLoading && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t("reports.no_data", "Дані відсутні. Оберіть каталог для завантаження звітів.")}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}