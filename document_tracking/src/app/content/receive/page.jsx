"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

export default function ReceivePage() {
  const { t } = useLanguage();
  return (
    <div className="flex-1 p-6 flex items-center justify-center bg-gray-50 dark:bg-[#161616]">
      <p className="text-gray-500">{t("receive")} - Page is being redesigned</p>
    </div>
  );
}
