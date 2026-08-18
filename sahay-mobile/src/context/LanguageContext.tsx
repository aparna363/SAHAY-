// SAHAY Mobile Language Context

import React, { createContext, useState, useContext } from 'react';
import { Language, translations } from '../translations';

interface LanguageContextType {
  lang: Language;
  t: typeof translations.en;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: translations.en,
  setLang: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');

  const currentTranslations = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, t: currentTranslations, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
