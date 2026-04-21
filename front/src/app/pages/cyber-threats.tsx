import { useState, useEffect } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { 
  Shield, AlertTriangle, Activity, Search, RefreshCw, 
  Zap, Skull, Bug, Globe, ShieldAlert, Timer, Eye, Target, XCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useTranslation } from "../../context/LanguageContext";

interface Threat {
  id: number;
  title: string;
  description: string;
  type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  category: "Warning" | "Active" | "Critical";
  timestamp: string;
}

// Threat Card Component
function ThreatCard({ 
  threat, 
  onSelect, 
  t, 
  getSeverityColor, 
  getTypeIcon, 
  renderThreatDescription, 
  getTranslatedThreatTitle 
}: {
  threat: Threat;
  onSelect: (t: Threat) => void;
  t: (key: string, fallback?: string) => string;
  getSeverityColor: (s: string) => string;
  getTypeIcon: (type: string) => React.ReactNode;
  renderThreatDescription: (th: Threat) => string;
  getTranslatedThreatTitle: (type: string) => string;
}) {
  return (
    <div 
      className="group relative bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all duration-200 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`mt-1 p-2 rounded-lg ${getSeverityColor(threat.severity)}`}>
            {getTypeIcon(threat.type)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{getTranslatedThreatTitle(threat.type)}</h3>
              <Badge variant="outline" className={getSeverityColor(threat.severity)}>
                {threat.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {renderThreatDescription(threat)}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" /> {threat.type}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Timer className="w-3 h-3" /> {new Date(threat.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground"
            onClick={() => onSelect(threat)}
          >
            {t('threats.details', 'Details')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal for Threat Details
function ThreatModal({ 
  selectedThreat, 
  onClose, 
  t, 
  getSeverityColor, 
  getTranslatedThreatTitle, 
  renderThreatDescription 
}: {
  selectedThreat: Threat | null;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
  getSeverityColor: (s: string) => string;
  getTranslatedThreatTitle: (type: string) => string;
  renderThreatDescription: (th: Threat) => string;
}) {
  if (!selectedThreat) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`h-2 ${
          selectedThreat.severity === 'Critical' ? 'bg-red-500' : 
          selectedThreat.severity === 'High' ? 'bg-orange-500' : 
          selectedThreat.severity === 'Medium' ? 'bg-yellow-500' : 'bg-emerald-500'
        }`} />
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <Badge variant="outline" className={`${getSeverityColor(selectedThreat.severity)}`}>
                {selectedThreat.severity}
              </Badge>
              <h2 className="text-xl font-bold text-foreground">{getTranslatedThreatTitle(selectedThreat.type)}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <span className="text-2xl">×</span>
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('threats.description', 'Description')}</p>
              <p className="text-sm text-foreground leading-relaxed">
                {renderThreatDescription(selectedThreat)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('threats.type', 'Type')}</p>
                <p className="text-sm font-semibold">{selectedThreat.type}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('threats.detected_at', 'Detected At')}</p>
                <p className="text-sm font-semibold">{new Date(selectedThreat.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button className="w-full" onClick={onClose}>{t('threats.close', 'Close')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CyberThreatsPage() {
  const { t } = useTranslation();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<Date | null>(null);

  const fetchThreats = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/threats");
      const data = await res.json();
      setThreats(data);
      setLastUpdateTimestamp(new Date());
    } catch (error) {
      console.error("Error fetching threats:", error);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchThreats();
    const interval = setInterval(() => fetchThreats(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-red-500/20 text-red-500 border-red-500/50";
      case "High": return "bg-orange-500/20 text-orange-500 border-orange-500/50";
      case "Medium": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
      default: return "bg-emerald-500/20 text-emerald-500 border-emerald-500/50";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DDoS": return <Zap className="w-4 h-4" />;
      case "Malware": return <Bug className="w-4 h-4" />;
      case "Brute-force": return <ShieldAlert className="w-4 h-4" />;
      case "Phishing": return <Globe className="w-4 h-4" />;
      case "Ransomware": return <Skull className="w-4 h-4" />;
      case "Port Scan": return <Eye className="w-4 h-4" />;
      case "Reconnaissance": return <Activity className="w-4 h-4" />;
      case "SQL Injection": return <ShieldAlert className="w-4 h-4" />;
      case "Data Exfiltration": return <Target className="w-4 h-4" />;
      case "APT": return <ShieldAlert className="w-4 h-4" />;
      case "Zero-day": return <XCircle className="w-4 h-4" />;
      case "Lateral Movement": return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const renderThreatDescription = (threat: Threat) => {
    const translateThreatDescription = (threatType: string): string => {
      const typeLower = threatType.toLowerCase();
      if (typeLower === 'ddos') return t('genericThreats.ddos_desc', '');
      if (typeLower === 'malware') return t('genericThreats.malware_desc', '');
      if (typeLower === 'bruteforce' || typeLower === 'brute-force') return t('genericThreats.bruteforce_desc', '');
      if (typeLower === 'phishing') return t('genericThreats.phishing_desc', '');
      if (typeLower === 'ransomware') return t('genericThreats.ransomware_desc', '');
      if (typeLower === 'sql injection') return t('genericThreats.sql_injection_desc', '');
      return '';
    };

    if (threat.description.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|[a-f0-9]{16,}|port\s+\d+/i)) {
      return threat.description;
    }

    const translatedDesc = translateThreatDescription(threat.type);
    return translatedDesc || threat.description;
  };

  const getTranslatedThreatTitle = (type: string): string => {
    const typeLower = type.toLowerCase();
    if (typeLower === 'ddos') return t('genericThreats.ddos_title', type);
    if (typeLower === 'malware') return t('genericThreats.malware_title', type);
    if (typeLower === 'bruteforce' || typeLower === 'brute-force') return t('genericThreats.bruteforce_title', type);
    if (typeLower === 'phishing') return t('genericThreats.phishing_title', type);
    if (typeLower === 'ransomware') return t('genericThreats.ransomware_title', type);
    if (typeLower === 'sql injection') return t('genericThreats.sql_injection_title', type);
    return type;
  };

  const warningThreats = threats.filter(th => th.category === "Warning");
  const activeThreats = threats.filter(th => th.category === "Active");
  const criticalThreats = threats.filter(th => th.category === "Critical");

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-card-foreground font-semibold text-xl">{t('threats.title')}</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchThreats(true)} 
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            {t('threats.refresh')}
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1200px] mx-auto space-y-6">
            {/* STATS SUMMARY */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('threats.warning_count', 'Warnings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">
                    {warningThreats.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('threats.active_threats')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {activeThreats.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('threats.critical_alerts')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {criticalThreats.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('threats.last_update')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    {lastUpdateTimestamp ? lastUpdateTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* WARNING THREATS */}
            {warningThreats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-lg font-semibold text-yellow-500">{t('threatCategories.warning', 'Warning')}</h2>
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                    {warningThreats.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {warningThreats.map((threat) => (
                    <ThreatCard 
                      key={threat.id} 
                      threat={threat} 
                      onSelect={setSelectedThreat} 
                      t={t} 
                      getSeverityColor={getSeverityColor} 
                      getTypeIcon={getTypeIcon} 
                      renderThreatDescription={renderThreatDescription} 
                      getTranslatedThreatTitle={getTranslatedThreatTitle} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVE THREATS */}
            {activeThreats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-orange-500">{t('threatCategories.active', 'Active')}</h2>
                  <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                    {activeThreats.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {activeThreats.map((threat) => (
                    <ThreatCard 
                      key={threat.id} 
                      threat={threat} 
                      onSelect={setSelectedThreat} 
                      t={t} 
                      getSeverityColor={getSeverityColor} 
                      getTypeIcon={getTypeIcon} 
                      renderThreatDescription={renderThreatDescription} 
                      getTranslatedThreatTitle={getTranslatedThreatTitle} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CRITICAL THREATS */}
            {criticalThreats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-red-500">{t('threatCategories.critical', 'Critical')}</h2>
                  <Badge variant="outline" className="text-red-500 border-red-500/30">
                    {criticalThreats.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {criticalThreats.map((threat) => (
                    <ThreatCard 
                      key={threat.id} 
                      threat={threat} 
                      onSelect={setSelectedThreat} 
                      t={t} 
                      getSeverityColor={getSeverityColor} 
                      getTypeIcon={getTypeIcon} 
                      renderThreatDescription={renderThreatDescription} 
                      getTranslatedThreatTitle={getTranslatedThreatTitle} 
                    />
                  ))}
                </div>
              </div>
            )}

            {threats.length === 0 && !loading && (
              <div className="py-20 text-center text-muted-foreground">
                {t('threats.no_threats')}
              </div>
            )}

            {loading && threats.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">
                {t('threats.scanning')}
              </div>
            )}
          </div>
        </main>

        {/* MODAL */}
        {selectedThreat && (
          <ThreatModal
            selectedThreat={selectedThreat}
            onClose={() => setSelectedThreat(null)}
            t={t}
            getSeverityColor={getSeverityColor}
            getTranslatedThreatTitle={getTranslatedThreatTitle}
            renderThreatDescription={renderThreatDescription}
          />
        )}
      </div>
    </div>
  );
}