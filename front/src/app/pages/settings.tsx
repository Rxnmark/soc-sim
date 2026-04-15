import { useEffect, useState } from "react";
import { Sidebar } from "../components/sidebar-nav";
import { Moon, Sun, Monitor, Paintbrush, Bell, Shield, User, Globe } from "lucide-react";
import { Button } from "../components/ui/button";
import { useTranslation } from "../../context/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function Settings() {
  const { t, language, setLanguage } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");

  // Завантажуємо збережену тему при відкритті сторінки
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("dark"); // За замовчуванням темна
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("app-theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="size-full flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 shrink-0">
          <div className="space-y-0.5">
            <h1 className="text-card-foreground font-semibold text-xl">{t('settings.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('settings.general_desc')}</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Language Settings */}
            <Card className="p-6 bg-card border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">{t('settings.language')}</h2>
                  <p className="text-sm text-muted-foreground">{t('settings.language_desc')}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant={language === 'en' ? 'default' : 'outline'} 
                  className="flex-1"
                  onClick={() => setLanguage('en')}
                >
                  {t('settings.en')}
                </Button>
                <Button 
                  variant={language === 'uk' ? 'default' : 'outline'} 
                  className="flex-1"
                  onClick={() => setLanguage('uk')}
                >
                  {t('settings.uk')}
                </Button>
              </div>
            </Card>

            {/* Appearance Settings */}
            <Card className="p-6 bg-card border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Paintbrush className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">{t('settings.appearance')}</h2>
                  <p className="text-sm text-muted-foreground">{t('settings.appearance_desc')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">{t('settings.theme_preference')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className={`flex flex-col items-center justify-center gap-3 h-28 border-2 transition-all hover:bg-muted/50 ${theme === 'light' ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary' : 'border-border text-muted-foreground'}`}
                      onClick={() => handleThemeChange("light")}
                    >
                      <Sun className="w-6 h-6" />
                      <span className="font-semibold">{t('settings.light')}</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`flex flex-col items-center justify-center gap-3 h-28 border-2 transition-all hover:bg-muted/50 ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary' : 'border-border text-muted-foreground'}`}
                      onClick={() => handleThemeChange("dark")}
                    >
                      <Moon className="w-6 h-6" />
                      <span className="font-semibold">{t('settings.dark')}</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`flex flex-col items-center justify-center gap-3 h-28 border-2 transition-all hover:bg-muted/50 ${theme === 'system' ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary' : 'border-border text-muted-foreground'}`}
                      onClick={() => handleThemeChange("system")}
                    >
                      <Monitor className="w-6 h-6" />
                      <span className="font-semibold">{t('settings.system')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Placeholder for future settings */}
            <div className="grid grid-cols-2 gap-6 opacity-60">
              <Card className="p-6 bg-card border-border shadow-sm pointer-events-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h2 className="text-base font-semibold text-card-foreground">{t('settings.notifications')}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{t('settings.notifications_desc')}</p>
              </Card>

              <Card className="p-6 bg-card border-border shadow-sm pointer-events-none">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h2 className="text-base font-semibold text-card-foreground">{t('settings.account_profile')}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{t('settings.account_desc')}</p>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}