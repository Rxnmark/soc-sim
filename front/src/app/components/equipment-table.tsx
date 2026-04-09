import { useEffect, useState } from "react";
import { Server, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Filter, Search } from "lucide-react";

interface Props {
  filterIp: string | null;
  setFilterIp: (ip: string | null) => void;
}

export function EquipmentTable({ filterIp, setFilterIp }: Props) {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // НОВИЙ СТАН ДЛЯ ПОШУКУ
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEquipment = () => {
    fetch("http://127.0.0.1:8000/api/v1/equipment")
      .then((res) => res.json())
      .then((data) => {
        setEquipmentList(data);
        setLoading(false);
      })
      .catch((err) => console.error("Помилка завантаження таблиці:", err));
  };

  useEffect(() => {
    fetchEquipment();
    const interval = setInterval(fetchEquipment, 5000);
    return () => clearInterval(interval);
  }, []);

  // ФІЛЬТРАЦІЯ (ПОШУК) + СОРТУВАННЯ
  const filteredAndSortedEquipment = [...equipmentList]
    .filter((eq) => 
      // Шукаємо збіги в імені або IP-адресі (без врахування регістру)
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      eq.ip_address.includes(searchQuery)
    )
    .sort((a, b) => {
      if (a.risk_level === "Critical" && b.risk_level !== "Critical") return -1;
      if (b.risk_level === "Critical" && a.risk_level !== "Critical") return 1;
      if (a.risk_level === "Medium" && b.risk_level !== "Medium") return -1;
      if (b.risk_level === "Medium" && a.risk_level !== "Medium") return 1;
      if (a.status !== "Online" && b.status === "Online") return -1;
      if (b.status !== "Online" && a.status === "Online") return 1;
      return 0;
    });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col h-full">
      {/* ОНОВЛЕНИЙ ЗАГОЛОВОК З ПОШУКОМ */}
      <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-card-foreground">Monitored Equipment</h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search device or IP..."
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
              <th className="w-[25%] px-6 py-3 font-medium">Device Name</th>
              <th className="w-[15%] px-6 py-3 font-medium">Type</th>
              <th className="w-[20%] px-6 py-3 font-medium">IP Address</th>
              <th className="w-[15%] px-6 py-3 font-medium">Status</th>
              <th className="w-[15%] px-6 py-3 font-medium">Risk Level</th>
              <th className="w-[10%] px-6 py-3 font-medium text-center">Filter Logs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Завантаження...</td></tr>
            ) : filteredAndSortedEquipment.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Обладнання не знайдено</td></tr>
            ) : (
              filteredAndSortedEquipment.map((eq) => (
                <tr key={eq.id} className={`border-b border-border last:border-0 hover:bg-muted/10 transition-colors ${filterIp === eq.ip_address ? 'bg-primary/5' : ''}`}>
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
                      <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md w-fit text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Online</span>
                    ) : eq.status === "Rebooting" ? (
                      <span className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md w-fit text-xs font-medium border border-blue-500/20"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Rebooting</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 bg-gray-500/10 px-2 py-1 rounded-md w-fit text-xs font-medium"><XCircle className="w-3.5 h-3.5" /> Offline</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {eq.risk_level === "Critical" ? (
                      <span className="flex items-center gap-1.5 text-red-500 font-medium"><ShieldAlert className="w-4 h-4" /> Critical</span>
                    ) : eq.risk_level === "Medium" ? (
                      <span className="text-yellow-500 font-medium">Medium</span>
                    ) : (
                      <span className="text-emerald-500 font-medium">Safe</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setFilterIp(filterIp === eq.ip_address ? null : eq.ip_address)}
                      className={`p-1.5 rounded-md transition-colors ${filterIp === eq.ip_address ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      title="Фільтрувати логи для цього IP"
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