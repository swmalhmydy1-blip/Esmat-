/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import SurahIndex from "./components/SurahIndex";
import SurahViewer from "./components/SurahViewer";
import AiAssistant from "./components/AiAssistant";
import BookmarksAndGoals from "./components/BookmarksAndGoals";
import AdhkarSection from "./components/AdhkarSection";
import PrayerTimesSection from "./components/PrayerTimesSection";
import { Bookmark, DailyGoal } from "./types";
import {
  Compass,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  HeartHandshake,
  Smartphone,
  Star,
  Clock,
  ExternalLink,
  Heart,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function App() {
  const [currentMode, setCurrentMode] = useState<"quran" | "adhkar" | "prayer">("quran");
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"index" | "reader">("index");

  // Load and manage custom bookmarked states in localStorage
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem("quran_bookmarks");
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(() => {
    const saved = localStorage.getItem("quran_daily_goal");
    const todayStr = new Date().toISOString().split("T")[0];

    if (saved) {
      const parsed = JSON.parse(saved) as DailyGoal;
      
      // If it is a new day, reset today's read counter while preserving/resetting streak
      if (parsed.lastReadDate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = parsed.streak;
        // If the last read date was neither today nor yesterday, reset the reading streak
        if (parsed.lastReadDate !== yesterdayStr && parsed.lastReadDate !== todayStr) {
          newStreak = 0;
        }

        return {
          targetAyahs: parsed.targetAyahs || 5,
          readToday: 0,
          streak: newStreak,
          lastReadDate: parsed.lastReadDate
        };
      }
      return parsed;
    }
    return {
      targetAyahs: 5,
      readToday: 0,
      streak: 0,
      lastReadDate: ""
    };
  });

  // Track the current time for aesthetic purposes (English time layout + Islamic greeting)
  const [currentTime, setCurrentTime] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save Bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem("quran_bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Save Daily Goal of reading verses to localStorage
  useEffect(() => {
    localStorage.setItem("quran_daily_goal", JSON.stringify(dailyGoal));
  }, [dailyGoal]);

  // Handle addition or removal of bookmarks on click
  const handleToggleBookmark = (item: Bookmark) => {
    setBookmarks((prev) => {
      const exists = prev.some(
        (b) => b.surahNumber === item.surahNumber && b.ayahNumber === item.ayahNumber
      );
      if (exists) {
        // Remove it
        return prev.filter((b) => !(b.surahNumber === item.surahNumber && b.ayahNumber === item.ayahNumber));
      } else {
        // Add new bookmark
        return [...prev, item];
      }
    });
  };

  const handleRemoveBookmark = (item: Bookmark) => {
    setBookmarks((prev) =>
      prev.filter((b) => !(b.surahNumber === item.surahNumber && b.ayahNumber === item.ayahNumber))
    );
  };

  // Register a verse citation read
  const handleRegisterReading = (ayahCount: number) => {
    const todayStr = new Date().toISOString().split("T")[0];
    setDailyGoal((prev) => {
      const isFirstReadOfNewDay = prev.lastReadDate !== todayStr;
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = prev.streak;

      if (isFirstReadOfNewDay) {
        // If last time they read was yesterday, increment streak!
        if (prev.lastReadDate === yesterdayStr) {
          newStreak = prev.streak + 1;
        } else if (prev.lastReadDate === "") {
          // First time reading
          newStreak = 1;
        } else if (prev.lastReadDate !== todayStr) {
          // If they missed a day, streak is reset to 1
          newStreak = 1;
        }
      }

      return {
        ...prev,
        readToday: prev.readToday + ayahCount,
        streak: newStreak,
        lastReadDate: todayStr
      };
    });
  };

  const handleUpdateGoalTarget = (newTarget: number) => {
    setDailyGoal((prev) => ({
      ...prev,
      targetAyahs: newTarget
    }));
  };

  // Navigate directly to a bookmarked verse
  const handleNavigateToAyahByBookmark = (surahNumber: number, ayahNumber: number) => {
    setSelectedSurahNumber(surahNumber);
    setActiveTab("reader");

    // Scroll to the verse node after a short dynamic DOM load delay
    setTimeout(() => {
      const elem = document.getElementById(`ayah-node-${ayahNumber}`);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 900);
  };

  const handleNextSurah = () => {
    if (selectedSurahNumber && selectedSurahNumber < 114) {
      setSelectedSurahNumber(selectedSurahNumber + 1);
    }
  };

  const handlePrevSurah = () => {
    if (selectedSurahNumber && selectedSurahNumber > 1) {
      setSelectedSurahNumber(selectedSurahNumber - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 pb-12 flex flex-col font-cairo">
      
      {/* Upper Islamic Header Banner */}
      <header className="bg-emerald-950 text-white relative border-b-4 border-amber-400 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950 via-emerald-950 to-stone-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-200 to-transparent pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-7 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          
          {/* Logo Name */}
          <div className="flex items-center gap-3.5 text-right md:text-right">
            <div className="w-14 h-14 bg-amber-400 text-emerald-950 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xl shadow-emerald-950/40 relative group shrink-0 border border-amber-300">
              <Compass className="w-8 h-8 rotate-12 transition-transform group-hover:rotate-45" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-amber-300 tracking-wide font-cairo flex items-center gap-2">
                 تطبيق عِصْمَت الإسلامي 🕋
              </h1>
              <p className="text-[10px] md:text-xs text-stone-200 font-medium">
                القرآن الكريم والأذكار، مواقيت الصلاة والآذان التلقائي الذكي
              </p>
            </div>
          </div>

          {/* Verses of the Day / Constant Encouragement */}
          <div className="hidden lg:block max-w-md bg-emerald-900/40 border border-emerald-800/40 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-200 font-serif italic mb-0.5" dir="rtl">
              "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ"
            </p>
            <span className="text-[10px] text-stone-300 block">سورة الرعد - الآية 28</span>
          </div>

          {/* Gregorian / Hijri Aesthetic Date Panel */}
          <div className="text-center md:text-left flex flex-col items-center md:items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-stone-300 bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-800">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>الخميس، 4 يونيو 2026 م</span>
              <span className="text-amber-200 font-bold"> • ذو الحجة 1447 هـ</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
              <Clock className="w-3 h-3 text-stone-400" />
              <span className="font-sans font-bold text-stone-300">{currentTime || "00:00:00"} UTC</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 mt-6 flex-1">
        
        {/* Mode switcher tabs (Quran vs Adhkar vs Prayer) */}
        <div className="flex flex-col sm:flex-row bg-white border border-stone-200/80 p-1.5 rounded-2xl shadow-xs max-w-4xl mx-auto mb-8 justify-between gap-3 font-cairo">
          <button
            onClick={() => {
              setCurrentMode("quran");
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              currentMode === "quran"
                ? "bg-emerald-800 text-white shadow-md shadow-emerald-800/10"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-800" />
            المصحْف الشَّريف والقراءة
          </button>
          
          <button
            onClick={() => setCurrentMode("adhkar")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              currentMode === "adhkar"
                ? "bg-emerald-800 text-white shadow-md shadow-emerald-800/10"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Heart className="w-4 h-4 fill-current text-rose-500" />
            الأذكار والمسبحة اليومية
          </button>

          <button
            onClick={() => setCurrentMode("prayer")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              currentMode === "prayer"
                ? "bg-emerald-800 text-white shadow-md shadow-emerald-800/10"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            مواقيت الصلاة والآذان التلقائي
          </button>
        </div>

        {/* Bento Grid layout dividing reader/index and Sidebar assistants */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LATEST/READER VIEWPORT (lg:col-span-8) */}
          <section className="lg:col-span-8 order-1 lg:order-1 space-y-6">
            
            {currentMode === "quran" ? (
              <>
                {/* Mobile Tab Swapper */}
                <div className="flex bg-stone-200/50 p-1.5 rounded-2xl border border-stone-150 justify-between gap-2 max-w-md lg:hidden">
                  <button
                    onClick={() => {
                      setActiveTab("index");
                      setSelectedSurahNumber(null);
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold font-cairo transition-all ${
                      activeTab === "index"
                        ? "bg-emerald-800 text-white shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                     فهرس السور (الفهرس)
                  </button>
                  <button
                    disabled={selectedSurahNumber === null}
                    onClick={() => setActiveTab("reader")}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold font-cairo transition-all disabled:opacity-40 disabled:pointer-events-none ${
                      activeTab === "reader"
                        ? "bg-emerald-800 text-white shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    قارئ المصحف الشريف
                  </button>
                </div>

                {/* Desktop and Active views switcher */}
                <div className="block">
                  {(() => {
                    // If on desktop (lg is active) or on mobile we render based on states
                    if (selectedSurahNumber !== null && (activeTab === "reader" || window.innerWidth >= 1024)) {
                      return (
                        <SurahViewer
                          surahNumber={selectedSurahNumber}
                          onBackToIndex={() => {
                            setSelectedSurahNumber(null);
                            setActiveTab("index");
                          }}
                          bookmarks={bookmarks}
                          onToggleBookmark={handleToggleBookmark}
                          onRegisterReading={handleRegisterReading}
                          onNextSurah={handleNextSurah}
                          onPrevSurah={handlePrevSurah}
                        />
                      );
                    } else {
                      return (
                        <SurahIndex
                          selectedSurahNumber={selectedSurahNumber}
                          onSelectSurah={(num) => {
                            setSelectedSurahNumber(num);
                            setActiveTab("reader");
                          }}
                        />
                      );
                    }
                  })()}
                </div>
              </>
            ) : currentMode === "adhkar" ? (
              <AdhkarSection />
            ) : (
              <PrayerTimesSection />
            )}

          </section>

          {/* SIDEBAR COMPANIONS (lg:col-span-4) */}
          <section className="lg:col-span-4 order-2 lg:order-2 space-y-6">
            
            {/* Bookmarks & goals first */}
            <BookmarksAndGoals
              bookmarks={bookmarks}
              onRemoveBookmark={handleRemoveBookmark}
              dailyGoal={dailyGoal}
              onUpdateGoalTarget={handleUpdateGoalTarget}
              onNavigateToAyah={handleNavigateToAyahByBookmark}
            />

            {/* Interactive Tafsir Chat Assistant */}
            <AiAssistant />

          </section>

        </div>

      </main>

      {/* Majestic Footer area */}
      <footer className="mt-16 border-t border-stone-100 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-stone-400 font-cairo font-bold tracking-wider">
            تصميم عصمت الحميدي
          </p>
        </div>
      </footer>
    </div>
  );
}
