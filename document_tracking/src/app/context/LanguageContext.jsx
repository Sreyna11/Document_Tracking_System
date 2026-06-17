"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../../Translations/en';
import { km } from '../../Translations/kh';
const translations = {
  en,
  km
};
const LanguageContext = createContext();
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('km');
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language_v2');
    if (savedLang) {
      setLanguage(savedLang);
    } else {
      localStorage.setItem('app_language_v2', 'km');
    }
  }, []);
  useEffect(() => {
    if (language === 'km') {
      document.documentElement.classList.add('lang-km');
    } else {
      document.documentElement.classList.remove('lang-km');
    }
  }, [language]);
  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'km' : 'en';
    setLanguage(newLang);
    localStorage.setItem('app_language_v2', newLang);
  };
  const t = (key) => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };
  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
