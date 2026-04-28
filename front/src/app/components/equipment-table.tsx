import { useEffect, useState } from "react";
import { Server, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Filter, Search, Lock, WifiOff } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";

interface Props {
  filterIp: string | null;
  setFilterIp: (ip: string | null) => void;
}

export function EquipmentTable({ filterIp, setFilterIp }: Props) {
  const { t } = useTranslation();
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEquipment = () => {
    fetch("http://127.0.0.1:8000/api/v1/equipment")
      .then((res) => res.json())
      .then((data) => {
        setEquipmentList(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error loading equipment table:", err));
  };

  useEffect(() => {
    fetchEquipment();
    const interval = setInterval(fetchEquipment, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort equipment
  const filteredAndSortedEquipment = [...equipmentList]
    .filter((eq) => 
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      eq.ip_address.includes(searchQuery)
    )
    .sort((a, b) => {
      // Rebooting always on top
      if (a.status === "Rebooting" && b.status !== "Rebooting") return -1;
      if (b.status === "Rebooting" && a.status !== "Rebooting") return 1;
      // Then by risk level
      const riskOrder = { Critical: 4, High: 3, Medium: 2, Warning: 1, Safe: 0 };
      const aRisk = riskOrder[a.risk_level] || 0;
      const bRisk = riskOrder[b.risk_level] || 0;
      if (bRisk !== aRisk) return bRisk - aRisk;
      if (a.status !== "Online" && b.status === "Online") return -1;
      if (b.status !== "Online" && a.status === "Online") return 1;
      return 0;
    });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-card-foreground">{t('equipment.title', 'Monitored Equipment')}</h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('equipment.search_placeholder', 'Search device or IP...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 rounded-md bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-xs text-muted-foreground bg-muted/20 border-b border-border sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="w-[25%] px-6 py-3 font-medium">{t('equipment.col_device', 'Device Name')}</th>
              <th className="w-[15%] px-6 py-3 font-medium">{t('equipment.col_type', 'Type')}</th>
              <th className="w-[20%] px-6 py-3 font-medium">{t('equipment.col_ip', 'IP Address')}</th>
              <th className="w-[15%] px-6 py-3 font-medium">{t('equipment.col_status', 'Status')}</th>
              <th className="w-[15%] px-6 py-3 font-medium">{t('equipment.col_risk', 'Risk Level')}</th>
              <th className="w-[10%] px-6 py-3 font-medium text-center">{t('equipment.col_filter', 'Filter Logs')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">{t('equipment.loading', 'Loading...')}</td></tr>
            ) : filteredAndSortedEquipment.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">{t('equipment.not_found', 'No equipment found')}</td></tr>
            ) : (
              filteredAndSortedEquipment.map((eq) => (
                <tr key={eq.id} className={`border-b border-border last:border-0 transition-colors ${filterIp === eq.ip_address ? 'bg-primary/5' : ''} ${eq.status === 'Unreachable' ? 'opacity-50' : 'hover:bg-muted/10'} ${eq.status === 'Encrypted' ? 'bg-red-950/20' : ''}`}>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Server className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-foreground truncate">{eq.name}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{eq.type}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{eq.ip_address}</td>
                  <td className="px-6 py-4">
                    {eq.status === "Online" ? (
                      <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md w-fit text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> {t('equipment.status_online', 'Online')}</span>
                    ) : eq.status === "Rebooting" ? (
                      <span className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md w-fit text-xs font-medium border border-blue-500/20"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t('equipment.status_rebooting', 'Rebooting')}</span>
                    ) : eq.status === "Encrypted" ? (
                      <span className="flex items-center gap-1.5 text-red-600 bg-red-600/20 px-2 py-1 rounded-md w-fit text-xs font-bold border border-red-600/30 animate-pulse"><Lock className="w-3.5 h-3.5" /> {t('equipment.status_encrypted', 'ENCRYPTED')}</span>
                    ) : eq.status === "Unreachable" ? (
                      <span className="flex items-center gap-1.5 text-gray-400 bg-gray-400/10 px-2 py-1 rounded-md w-fit text-xs font-medium opacity-60"><WifiOff className="w-3.5 h-3.5" /> {t('equipment.status_unreachable', 'Unreachable')}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 bg-gray-500/10 px-2 py-1 rounded-md w-fit text-xs font-medium"><XCircle className="w-3.5 h-3.5" /> {t('equipment.status_offline', 'Offline')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {eq.risk_level === "Critical" ? (
                      <span className="flex items-center gap-1.5 text-red-500 font-medium"><ShieldAlert className="w-4 h-4" /> {t('equipment.risk_critical', 'Critical')}</span>
                    ) : eq.risk_level === "High" ? (
                      <span className="text-orange-500 font-medium">{t('equipment.risk_high', 'High')}</span>
                    ) : eq.risk_level === "Medium" ? (
                      <span className="text-yellow-500 font-medium">{t('equipment.risk_medium', 'Medium')}</span>
                    ) : eq.risk_level === "Warning" ? (
                      <span className="text-amber-400 font-medium">{t('equipment.risk_warning', 'Warning')}</span>
                    ) : (
                      <span className="text-emerald-500 font-medium">{t('equipment.risk_safe', 'Safe')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setFilterIp(filterIp === eq.ip_address ? null : eq.ip_address)}
                      className={`p-1.5 rounded-md transition-colors ${filterIp === eq.ip_address ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      title={t('equipment.filter_logs', 'Filter logs for this IP')}
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}