"use client";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { SidebarProvider } from "./context/SidebarContext";

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
