import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from '../translations/en';
import uk from '../translations/uk';

type Language = 'en' | 'uk';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language') as Language;
    return saved || 'en';
  });

  const setLanguageWithStorage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string, fallback?: string) => {
    const keys = key.split('.');
    const translations = language === 'en' ? en : uk;
    let value: any = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    return value || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageWithStorage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};