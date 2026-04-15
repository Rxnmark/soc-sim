import { useState } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { Settings, Shield, User, Bell, Lock, Database, Globe } from "lucide-react";
import { Button } from "../components/ui/button";
import { useTranslation } from "../../context/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function CyberSettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageChange = (lang: 'en' | 'uk') => {
    setLanguage(lang);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <h1 className="text-card-foreground font-semibold text-xl">{t('settings.title')}</h1>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "..." : t('settings.save')}
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[800px] mx-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{t('settings.general')}</h2>
              <p className="text-sm text-muted-foreground">{t('settings.general_desc')}</p>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t('settings.language')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.language_desc')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={language === 'en' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleLanguageChange('en')}
                  >
                    {t('settings.en')}
                  </Button>
                  <Button 
                    variant={language === 'uk' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleLanguageChange('uk')}
                  >
                    {t('settings.uk')}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{t('settings.notifications')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.notifications_desc')}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">{t('settings.enabled')}</Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}