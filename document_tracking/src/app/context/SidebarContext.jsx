"use client";
import { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      setIsSidebarOpen(saved === "false");
    }
  }, []);

  const toggleSidebar = (value) => {
    setIsSidebarOpen((prev) => {
      const next = typeof value === "boolean" ? value : !prev;
      localStorage.setItem("sidebar_collapsed", next ? "false" : "true");
      return next;
    });
  };

  // Prevent flash of incorrect state on server rendering
  if (!isMounted) {
    return (
      <SidebarContext.Provider value={{ isSidebarOpen: true, setIsSidebarOpen: toggleSidebar }}>
        {children}
      </SidebarContext.Provider>
    );
  }

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, setIsSidebarOpen: toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
