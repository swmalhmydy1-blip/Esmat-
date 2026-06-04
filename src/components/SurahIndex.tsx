/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { quranSurahs } from "../data/quranMetadata";
import { SurahMetadata } from "../types";
import { Search, Compass, BookOpen, Star } from "lucide-react";

interface SurahIndexProps {
  onSelectSurah: (surahNumber: number) => void;
  selectedSurahNumber: number | null;
}

export default function SurahIndex({ onSelectSurah, selectedSurahNumber }: SurahIndexProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "Meccan" | "Medinan">("all");

  const filteredSurahs = quranSurahs.filter((surah) => {
    const matchesSearch =
      surah.name.includes(searchQuery) ||
      surah.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surah.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      surah.number.toString() === searchQuery;

    const matchesType = filterType === "all" || surah.revelationType === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 md:p-6" id="surah-index-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2 font-cairo">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            الفهرس الشامل للسور
            <span className="text-xs font-normal text-stone-500 font-sans">
              (114 Surahs)
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            ابحث عن السورة الكريمة بنصّ اسمها العربي، الإنجليزي أو برقمها
          </p>
        </div>

        {/* Revelation Type Filter Tabs */}
        <div className="flex bg-stone-100 rounded-lg p-1 text-xs self-start md:self-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              filterType === "all"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType("Meccan")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              filterType === "Meccan"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            مكيّة 🕋
          </button>
          <button
            onClick={() => setFilterType("Medinan")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              filterType === "Medinan"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            مدنيّة 🕌
          </button>
        </div>
      </div>

      {/* Styled Search Bar */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-stone-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          placeholder="ابحث باسم السورة (مثلاً: البقرة، الكهف، Al-Mulk..)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-right pr-11 pl-4 py-3 bg-stone-50 border border-stone-200 focus:border-emerald-600 focus:bg-white rounded-xl text-stone-800 text-sm placeholder-stone-400 outline-none transition-all font-cairo shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 left-3 flex items-center text-xs text-stone-400 hover:text-stone-600 font-cairo"
          >
            مسح
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredSurahs.length > 0 ? (
          filteredSurahs.map((surah) => {
            const isSelected = selectedSurahNumber === surah.number;
            return (
              <button
                key={surah.number}
                onClick={() => onSelectSurah(surah.number)}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-right transition-all group ${
                  isSelected
                    ? "border-emerald-700 bg-emerald-50/70 shadow-sm"
                    : "border-stone-150 hover:border-emerald-500 hover:bg-emerald-50/20 bg-stone-25"
                }`}
                id={`surah-card-${surah.number}`}
              >
                {/* Right Area: Num, Arabic Name, Type */}
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-9 h-9 font-bold text-xs shrink-0 font-sans">
                    {/* Decorative Islamic Star Pattern for Surah Number */}
                    <div className={`absolute inset-0 border-2 rotate-45 rounded-sm transition-transform group-hover:rotate-90 ${
                      isSelected ? "border-emerald-700" : "border-stone-300"
                    }`}></div>
                    <div className={`absolute inset-0 border-2 rotate-12 rounded-sm transition-transform group-hover:rotate-45 ${
                      isSelected ? "border-emerald-700 opacity-60" : "border-stone-300 opacity-40"
                    }`}></div>
                    <span className={isSelected ? "text-emerald-800 z-10" : "text-stone-700 z-10"}>
                      {surah.number}
                    </span>
                  </div>

                  <div className="text-right">
                    <h3 className="font-bold text-stone-800 font-cairo text-sm leading-tight">
                      سورة {surah.name}
                    </h3>
                    <p className="text-[10px] text-stone-400 mt-0.5 font-sans">
                      {surah.englishName}
                    </p>
                  </div>
                </div>

                {/* Left Area: Total Ayahs, Type Indicator */}
                <div className="text-left flex flex-col items-end gap-1">
                  <span className="text-xs font-bold text-stone-600 font-sans">
                    {surah.numberOfAyahs} آيات
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-cairo leading-none ${
                    surah.revelationType === "Meccan"
                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                      : "bg-teal-50 text-teal-700 border border-teal-100"
                  }`}>
                    {surah.revelationType === "Meccan" ? "مكة" : "المدينة"}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-stone-400 font-cairo text-sm">
            لا توجد سور مطابقة لبحثك. جرب كلمة أخرى.
          </div>
        )}
      </div>
    </div>
  );
}
