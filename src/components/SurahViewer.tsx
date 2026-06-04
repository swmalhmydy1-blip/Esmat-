/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { SurahDetail, Ayah, Reciter, Bookmark } from "../types";
import { reciters } from "../data/quranMetadata";
import {
  Play,
  Pause,
  BookMarked,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Volume2,
  X,
  Copy,
  Check,
  Type,
  Maximize2,
  RefreshCw,
  Clock
} from "lucide-react";

interface SurahViewerProps {
  surahNumber: number;
  onBackToIndex: () => void;
  bookmarks: Bookmark[];
  onToggleBookmark: (bookmark: Bookmark) => void;
  onRegisterReading: (count: number) => void;
  onNextSurah: () => void;
  onPrevSurah: () => void;
}

export default function SurahViewer({
  surahNumber,
  onBackToIndex,
  bookmarks,
  onToggleBookmark,
  onRegisterReading,
  onNextSurah,
  onPrevSurah
}: SurahViewerProps) {
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [fontSize, setFontSize] = useState<number>(28); // default font size in pixels (fits beautiful page style better)
  const [showTranslation, setShowTranslation] = useState(true);
  const [selectedReciter, setSelectedReciter] = useState<string>("ar.alafasy");
  const [viewMode, setViewMode] = useState<"mushaf" | "list">("mushaf");
  const [activeMushafAyah, setActiveMushafAyah] = useState<Ayah | null>(null);

  // Audio Playback
  const [activePlayAyahNum, setActivePlayAyahNum] = useState<number | null>(null); // absolute number
  const [isPlayingContinuous, setIsPlayingContinuous] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // AI Tafsir Modal
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [tafsirAyah, setTafsirAyah] = useState<{ ayahNum: number; text: string } | null>(null);
  const [tafsirContent, setTafsirContent] = useState<string>("");
  const [copiedTafsir, setCopiedTafsir] = useState(false);

  // General Notification
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Load Surah Data
  useEffect(() => {
    let isMounted = true;
    const fetchSurah = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Arabic Uthmani text, English Sahih translation, and audio Recitation of selected reciter
        const response = await fetch(
          `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,${selectedReciter}`
        );
        const data = await response.json();

        if (!isMounted) return;

        if (data.code === 200 && data.data) {
          const arabicData = data.data[0];
          const englishData = data.data[1];
          const audioData = data.data[2];

          // Map the three editions together
          const mappedAyahs: Ayah[] = arabicData.ayahs.map((ayah: any, index: number) => ({
            ...ayah,
            translation: englishData.ayahs[index]?.text,
            audio: audioData.ayahs[index]?.audio,
          }));

          const surahDetail: SurahDetail = {
            number: arabicData.number,
            name: arabicData.name,
            englishName: arabicData.englishName,
            englishNameTranslation: arabicData.englishNameTranslation,
            numberOfAyahs: arabicData.numberOfAyahs,
            revelationType: arabicData.revelationType,
            ayahs: mappedAyahs,
          };

          setSurah(surahDetail);
          if (mappedAyahs && mappedAyahs.length > 0) {
            setActiveMushafAyah(mappedAyahs[0]);
          }
          // Increment reading count progress upon opening a surah
          onRegisterReading(1);
        } else {
          setError("فشل تحميل بيانات السورة من الخادم، يرجى المحاولة لاحقاً.");
        }
      } catch (err) {
        console.error("Fetch surah error:", err);
        if (isMounted) {
          setError("عذراً، حدث خطأ أثناء الاتصال بالشبكة لتحميل السورة.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSurah();

    // Stop audio player on surah transition
    stopAudio();

    return () => {
      isMounted = false;
    };
  }, [surahNumber, selectedReciter]);

  // Audio Control helpers
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setActivePlayAyahNum(null);
    setIsPlayingContinuous(false);
  };

  const playAyahAudio = (ayah: Ayah, continuous = false) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    // If currently playing the requested item, toggle pause
    if (activePlayAyahNum === ayah.number) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlayingContinuous(continuous);
      } else {
        audioRef.current.pause();
        setIsPlayingContinuous(false);
      }
      return;
    }

    if (!ayah.audio) {
      showToast("الملف الصوتي لهذه الآية غير متاح حالياً.");
      return;
    }

    audioRef.current.src = ayah.audio;
    audioRef.current.play()
      .then(() => {
        setActivePlayAyahNum(ayah.number);
        setIsPlayingContinuous(continuous);
        onRegisterReading(1);

        // Highlight scroll into view
        const element = document.getElementById(`ayah-node-${ayah.numberInSurah}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      })
      .catch((err) => {
        console.error("Audio play error:", err);
        showToast("خطأ عند تحميل ملف التلاوة، جرب ريكورد غداً أو اعد المحاولة.");
        setIsPlayingContinuous(false);
        setActivePlayAyahNum(null);
      });

    // Handle end of audio track
    audioRef.current.onended = () => {
      if (continuous && surah) {
        // Find next index in surah
        const currentIndex = surah.ayahs.findIndex((a) => a.number === ayah.number);
        if (currentIndex !== -1 && currentIndex < surah.ayahs.length - 1) {
          // Play next verse
          playAyahAudio(surah.ayahs[currentIndex + 1], true);
        } else {
          // Reached end of the Surah
          stopAudio();
          showToast("تم الانتهاء من تلاوة السورة الكريمة بنجاح.");
        }
      } else {
        setActivePlayAyahNum(null);
      }
    };
  };

  const playFromStartContinuous = () => {
    if (!surah || surah.ayahs.length === 0) return;
    playAyahAudio(surah.ayahs[0], true);
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Tafsir trigger via Gemini Backend API
  const handleFetchTafsir = async (ayah: Ayah) => {
    if (!surah) return;
    setTafsirLoading(true);
    setTafsirAyah({ ayahNum: ayah.numberInSurah, text: ayah.text });
    setTafsirContent("");
    
    try {
      const response = await fetch("/api/gemini/tafsir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surahNumber: surah.number,
          surahName: surah.name,
          ayahNumber: ayah.numberInSurah,
          ayahText: ayah.text,
          translation: ayah.translation,
        }),
      });

      const data = await response.json();
      if (response.ok && data.tafsir) {
        setTafsirContent(data.tafsir);
      } else {
        setTafsirContent("عذراً، فشلت عملية تدبر وتفسير الآية الكريمة حالياً. الرجاء تكرار المحاولة لاحقاً.");
      }
    } catch (err) {
      console.error("Tafsir error:", err);
      setTafsirContent("حدث خطأ في الاتصال بالشبكة لطلب التفسير من خادم الذكاء الاصطناعي.");
    } finally {
      setTafsirLoading(false);
    }
  };

  const copyTafsirToClipboard = () => {
    if (!tafsirContent) return;
    navigator.clipboard.writeText(tafsirContent)
      .then(() => {
        setCopiedTafsir(true);
        setTimeout(() => setCopiedTafsir(false), 2000);
      })
      .catch((err) => console.error("Copy failed", err));
  };

  // Convert custom simple markdown strings to HTML safely to preserve bold titles
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      // Bold title formatting
      let converted = line;
      
      // Match bold titles like ### Title
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-base font-bold text-emerald-800 mt-5 mb-2 font-cairo text-right pr-2 border-r-4 border-emerald-600">
            {line.replace("### ", "")}
          </h4>
        );
      }
      
      // Match general list formats
      const isListItem = line.trim().startsWith("- ") || line.trim().match(/^\d+\.\s/);
      const cleanLine = line.replace(/^- /, "").replace(/^\d+\.\s/, "");

      // Handle simple bold tokens: **bold text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIdx = 0;
      let match;
      
      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIdx) {
          parts.push(cleanLine.substring(lastIdx, match.index));
        }
        parts.push(<strong key={match.index} className="text-stone-800 font-bold">{match[1]}</strong>);
        lastIdx = boldRegex.lastIndex;
      }
      if (lastIdx < cleanLine.length) {
        parts.push(cleanLine.substring(lastIdx));
      }

      if (isListItem) {
        return (
          <li key={idx} className="list-none text-right pr-4 relative text-sm text-stone-700 leading-relaxed mb-1.5 font-cairo">
            <span className="absolute right-0 top-2.5 w-1.5 h-1.5 bg-emerald-700 rounded-full"></span>
            {parts.length > 0 ? parts : cleanLine}
          </li>
        );
      }

      return (
        <p key={idx} className="text-right text-sm text-stone-600 leading-relaxed min-h-[1rem] my-1 font-cairo">
          {parts.length > 0 ? parts : cleanLine}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden" id="quran-reader-container">
      {/* Surah Header Stats panel */}
      <div className="bg-emerald-950 text-white p-6 relative">
        {/* Transparent Islamic Pattern Decoration */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-teal-900 to-transparent pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={onBackToIndex}
              className="p-2 bg-emerald-900/60 hover:bg-emerald-800 rounded-lg text-white transition-colors duration-150 text-xs font-cairo font-semibold"
            >
              ← الفهرس والسور
            </button>
            <div className="w-px h-6 bg-emerald-800 hidden md:block"></div>
            <div className="text-right">
              {surah && (
                <>
                  <h1 className="text-2xl font-bold font-cairo tracking-wide text-amber-300">
                    سورة {surah.name}
                  </h1>
                  <p className="text-xs text-stone-300 font-sans mt-0.5">
                    {surah.englishName} ({surah.englishNameTranslation})
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Surah spec badges */}
          {surah && (
            <div className="flex items-center gap-3 text-xs">
              <span className="bg-emerald-900/80 px-3 py-1.5 rounded-lg border border-emerald-800 text-stone-200">
                {surah.revelationType === "Meccan" ? "مكّيّة 🕋" : "مدنيّة 🕌"}
              </span>
              <span className="bg-emerald-900/80 px-3 py-1.5 rounded-lg border border-emerald-800 text-stone-200">
                {surah.numberOfAyahs} آيات
              </span>
              <span className="bg-emerald-900/80 px-3 py-1.5 rounded-lg border border-emerald-800 text-stone-200">
                رقم السورة: {surah.number}
              </span>
            </div>
          )}
        </div>

        {/* Quick Nav Controls */}
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-emerald-900/50 relative z-10 text-xs">
          <button
            onClick={onPrevSurah}
            disabled={surahNumber <= 1}
            className="flex items-center gap-1.5 text-stone-200 hover:text-amber-300 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
            السورة السابقة
          </button>

          {/* Core Recitation Play Actions */}
          {surah && (
            <button
              onClick={isPlayingContinuous ? stopAudio : playFromStartContinuous}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-md transition-all ${
                isPlayingContinuous
                  ? "bg-amber-400 hover:bg-amber-500 text-stone-900"
                  : "bg-amber-300 hover:bg-amber-400 text-emerald-950"
              }`}
            >
              {isPlayingContinuous ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  إيقاف التلاوة
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  تشغيل السورة كاملاً
                </>
              )}
            </button>
          )}

          <button
            onClick={onNextSurah}
            disabled={surahNumber >= 114}
            className="flex items-center gap-1.5 text-stone-200 hover:text-amber-300 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            السورة التالية
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control View Settings (Font size, translations, toggles) */}
      <div className="bg-stone-50 border-b border-stone-100 p-4 flex flex-col md:flex-row gap-4 items-center justify-between text-xs text-stone-600">
        
        {/* Toggle Reading View Style */}
        <div className="flex bg-stone-200/60 p-1 rounded-xl w-full md:w-auto items-center font-cairo" id="view-mode-selector">
          <button
            onClick={() => {
              setViewMode("mushaf");
              if (surah && surah.ayahs && surah.ayahs.length > 0 && !activeMushafAyah) {
                setActiveMushafAyah(surah.ayahs[0]);
              }
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "mushaf"
                ? "bg-emerald-850 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>رسم صفحات المصحف</span>
          </button>
          
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "list"
                ? "bg-emerald-850 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>الآيات آية بآية</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-cairo text-[11px] font-semibold text-stone-700 ml-1">القارئ:</span>
            <select
              value={selectedReciter}
              onChange={(e) => setSelectedReciter(e.target.value)}
              className="bg-transparent font-cairo outline-none pr-5 text-stone-700 font-semibold cursor-pointer text-[11px]"
            >
              {reciters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.style})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5">
            <Type className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-cairo text-[11px]">حجم الخط:</span>
            <input
              type="range"
              min="18"
              max="45"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-16 accent-emerald-800"
            />
            <span className="font-sans font-bold text-stone-700">{fontSize}px</span>
          </div>

          {viewMode === "list" && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-stone-200 rounded-lg px-3 py-1.5 shadow-sm hover:bg-stone-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={showTranslation}
                  onChange={(e) => setShowTranslation(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span className="font-cairo text-[11px] font-medium select-none text-stone-700">ترجمة المعاني بالإنجليزية</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Main Reading Flow Panel */}
      <div className="p-6 md:p-8 bg-[#fdfcf7] min-h-[400px]">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
            <p className="text-sm font-cairo text-stone-500">جاري تحميل آيات السورة وتنسيقها من المصحف الشريف...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600 font-cairo flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-red-50 rounded-full text-red-600">
              <X className="w-6 h-6" />
            </div>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setSelectedReciter(selectedReciter)} // triggers a reload
              className="mt-2 px-4 py-2 bg-emerald-800 text-white text-xs rounded-lg font-cairo font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : surah ? (
          viewMode === "mushaf" ? (
            /* --- PRESTIGE MUSHAF PAGE VIEW STYLE --- */
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in" id="mushaf-view-page">
              
              {/* Wooden-like ornamental reading stand frame */}
              <div className="relative bg-[#FBF8EF] rounded-3xl border-4 border-double border-amber-600/70 p-6 md:p-10 shadow-lg select-text min-h-[500px]">
                
                {/* Traditional Corner Ornaments */}
                <div className="absolute top-3 right-3 text-amber-700/60 font-serif text-lg select-none pointer-events-none">✥</div>
                <div className="absolute top-3 left-3 text-amber-700/60 font-serif text-lg select-none pointer-events-none">✥</div>
                <div className="absolute bottom-3 right-3 text-amber-700/60 font-serif text-lg select-none pointer-events-none">✥</div>
                <div className="absolute bottom-3 left-3 text-amber-700/60 font-serif text-lg select-none pointer-events-none">✥</div>

                {/* Subtle outer double nested thin margin guidelines representing classic gilded pages */}
                <div className="absolute inset-2 border border-dashed border-amber-600/20 rounded-2xl pointer-events-none"></div>
                <div className="absolute inset-3 border border-double border-amber-600/10 rounded-2xl pointer-events-none"></div>

                {/* Surah Decorative banner Title block (إطار السورة المزركش) */}
                <div className="flex items-center justify-center mb-8 relative z-10">
                  <div className="w-full max-w-xl bg-gradient-to-r from-amber-600/5 via-amber-600/15 to-amber-600/5 border-2 border-double border-amber-600/50 rounded-xl py-3 px-6 text-center shadow-sm">
                    <h2 className="text-xl md:text-2xl font-bold font-cairo text-amber-950">
                      سُورَةُ {surah.name}
                    </h2>
                    <p className="text-[10px] md:text-xs text-stone-500 font-cairo mt-1">
                      {surah.revelationType === "Meccan" ? "مكّيّة 🕋" : "مدنيّة 🕌"} • {surah.numberOfAyahs} آيات • رقم السورة {surah.number}
                    </p>
                  </div>
                </div>

                {/* Basmallah (unless Surah is At-Tawbah (9)) */}
                {surah.number !== 9 && (
                  <div className="text-center py-4 mb-6" id="basmallah-mushaf">
                    <p className="text-2xl md:text-3xl font-amiri text-stone-850 inline-block font-semibold">
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </p>
                  </div>
                )}

                {/* Continuous flowing Surah Uthmani Text */}
                <div 
                  className="quran-text text-stone-900 tracking-wide select-all text-justify md:text-center leading-[2.8] md:leading-[3.3] pb-6 relative z-10 font-normal pr-1 pl-1"
                  style={{ fontSize: `${fontSize}px`, direction: "rtl" }}
                >
                  {surah.ayahs.map((ayah) => {
                    const isPlaying = activePlayAyahNum === ayah.number;
                    const isActive = activeMushafAyah?.number === ayah.number;

                    // Clean Basmallah from first verse if it starts with it and surah is not Fatiha (1) and not At-Tawbah (9)
                    let displayArabicText = ayah.text;
                    if (
                      surah.number !== 1 &&
                      surah.number !== 9 &&
                      ayah.numberInSurah === 1 &&
                      ayah.text.startsWith("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
                    ) {
                      displayArabicText = ayah.text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
                      if (!displayArabicText) {
                        displayArabicText = ayah.text;
                      }
                    }

                    return (
                      <span
                        key={ayah.number}
                        id={`ayah-node-${ayah.numberInSurah}`}
                        onClick={() => setActiveMushafAyah(ayah)}
                        className={`relative inline-wrap transition-all duration-200 rounded cursor-pointer px-1 py-0.5 mx-0.5 select-text hover:bg-amber-600/10 ${
                          isPlaying
                            ? "bg-amber-200/95 ring-2 ring-amber-400 px-1.5 shadow-sm text-stone-950 font-medium"
                            : isActive
                            ? "bg-emerald-500/20 ring-1 ring-emerald-600/40 px-1 shadow-2xs font-medium text-emerald-950"
                            : ""
                        }`}
                        title={`الآية رقم ${ayah.numberInSurah}`}
                      >
                        {displayArabicText}

                        {/* Ayat Circle end Badge with traditional shape ۝ */}
                        <span className="inline-flex items-center justify-center mx-1.5 text-amber-800 font-sans font-black text-[10px] md:text-[11px] w-6 h-6 rounded-full border border-amber-600/50 bg-amber-50/80 shadow-2xs select-none align-middle font-semibold">
                          {ayah.numberInSurah}
                        </span>
                      </span>
                    );
                  })}
                </div>

                {/* Page Footer decoration containing Surah specs */}
                <div className="flex justify-between items-center border-t border-amber-600/10 pt-4 mt-6 text-[10px] text-amber-800/60 font-cairo select-none">
                  <span>ربع الحزب • الجزء {surah.ayahs[0]?.juz}</span>
                  <span className="font-sans font-bold">صفحة {surah.ayahs[0]?.page}</span>
                  <span>عصمت الإسلامي</span>
                </div>

              </div>

              {/* INTEGRATED MODERN DESK / AYAH DETAILS STAND PANEL */}
              {activeMushafAyah && (
                <div className="bg-[#FAF9F5] border border-amber-600/30 rounded-2xl shadow-sm p-5 space-y-4 text-right animate-fade-in">
                  
                  {/* Top line descriptor */}
                  <div className="flex justify-between items-center border-b border-amber-600/10 pb-2.5">
                    <button
                      onClick={() => setActiveMushafAyah(null)}
                      className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors"
                      title="إغلاق اللوحة"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-amber-500/15 text-amber-900 border border-amber-600/20 px-2 py-0.5 rounded font-semibold font-cairo">
                        الآية {activeMushafAyah.numberInSurah} من سورة {surah.name} • الجزء {activeMushafAyah.juz} • الصفحة {activeMushafAyah.page}
                      </span>
                    </div>
                  </div>

                  {/* Highlighting the active arabic verse in large high contrast readable context */}
                  <div className="bg-white/60 p-3.5 rounded-xl border border-stone-100 text-right leading-relaxed select-text">
                    <p className="font-amiri text-stone-900 font-medium text-lg leading-loose">
                      {activeMushafAyah.text}
                    </p>
                  </div>

                  {/* Translation block */}
                  <div className="text-left font-sans text-stone-500 text-sm italic py-1 leading-relaxed border-l-4 border-emerald-700/60 pl-3">
                    {activeMushafAyah.translation}
                  </div>

                  {/* Actions Stand controls for active verse */}
                  <div className="flex flex-wrap gap-2 pt-2 items-center justify-end font-cairo text-xs">
                    
                    {/* Listen Button */}
                    <button
                      onClick={() => {
                        playAyahAudio(activeMushafAyah);
                      }}
                      className={`px-4 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
                        activePlayAyahNum === activeMushafAyah.number
                          ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-150"
                          : "bg-white text-stone-700 hover:bg-stone-55 border-stone-200"
                      }`}
                    >
                      <Volume2 className="w-4 h-4 text-emerald-800" />
                      <span>{activePlayAyahNum === activeMushafAyah.number ? "إيقاف الصوت" : "استماع للتلاوة"}</span>
                    </button>

                    {/* Bookmark Button */}
                    <button
                      onClick={() =>
                        onToggleBookmark({
                          surahNumber: surah.number,
                          surahName: surah.name,
                          ayahNumber: activeMushafAyah.numberInSurah,
                          ayahText: activeMushafAyah.text,
                          timestamp: Date.now(),
                        })
                      }
                      className={`px-4 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
                        bookmarks.some((b) => b.surahNumber === surah.number && b.ayahNumber === activeMushafAyah.numberInSurah)
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-white text-stone-700 hover:bg-stone-55 border-stone-200"
                      }`}
                    >
                      <BookMarked className="w-4 h-4 text-emerald-850 fill-current" />
                      <span>حفظ الفاصلة</span>
                    </button>

                    {/* AI Tafsir Button */}
                    <button
                      onClick={() => handleFetchTafsir(activeMushafAyah)}
                      className="px-4 py-2 bg-emerald-850 hover:bg-emerald-950 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors animate-pulse"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>تدبّر وتفسير الغريب</span>
                    </button>

                  </div>

                </div>
              )}

            </div>
          ) : (
            /* --- DETAILED LIST VIEW STYLE --- */
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
              
              {/* Audibly play Basmallah header (unless Surah is Al-Tawbah/At-Tawbah (9)) */}
              {surah.number !== 9 && (
                <div className="text-center py-6 mb-8 border-b border-stone-100/70" id="basmallah-box">
                  <p className="text-3xl font-amiri text-stone-800 inline-block font-bold">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                </div>
              )}

              {/* Verse-by-verse list */}
              <div className="space-y-6">
                {surah.ayahs.map((ayah) => {
                  const isPlaying = activePlayAyahNum === ayah.number;
                  
                  // Let's filter the bookmark structure
                  const isBookmarked = bookmarks.some(
                    (b) => b.surahNumber === surah.number && b.ayahNumber === ayah.numberInSurah
                  );

                  // Strip Basmallah from first verse if it starts with it and surah is not 1 (Fatiha) and not At-Tawbah
                  let displayArabicText = ayah.text;
                  if (
                    surah.number !== 1 &&
                    surah.number !== 9 &&
                    ayah.numberInSurah === 1 &&
                    ayah.text.startsWith("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
                  ) {
                    displayArabicText = ayah.text.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
                    if (!displayArabicText) {
                      displayArabicText = ayah.text;
                    }
                  }

                  return (
                    <div
                      key={ayah.number}
                      id={`ayah-node-${ayah.numberInSurah}`}
                      className={`p-4 md:p-5 rounded-2xl border transition-all duration-300 ${
                        isPlaying
                          ? "bg-amber-50/40 border-amber-300/80 shadow-md scale-[1.01]"
                          : "border-stone-100/60 hover:bg-stone-50/50 bg-white"
                      }`}
                    >
                      {/* Verse meta actions bar */}
                      <div className="flex justify-between items-center pb-3 mb-4 border-b border-stone-100 text-stone-500 text-xs">
                        {/* Left: action icons */}
                        <div className="flex items-center gap-3">
                          {/* Audio play button */}
                          <button
                            onClick={() => playAyahAudio(ayah)}
                            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                              isPlaying
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "hover:bg-stone-100 text-stone-600"
                            }`}
                            title="استمع للآية"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>

                          {/* Bookmark button */}
                          <button
                            onClick={() =>
                              onToggleBookmark({
                                surahNumber: surah.number,
                                surahName: surah.name,
                                ayahNumber: ayah.numberInSurah,
                                ayahText: ayah.text,
                                timestamp: Date.now(),
                              })
                            }
                            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                              isBookmarked
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "hover:bg-stone-100 text-stone-600"
                            }`}
                            title="حفظ الآية بالفواصل"
                          >
                            <BookMarked className="w-4 h-4 fill-current" />
                          </button>

                          {/* AI Tafsir triggers */}
                          <button
                            onClick={() => handleFetchTafsir(ayah)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all font-cairo shadow-sm"
                            title="تفسير وتدبر بالذكاء الاصطناعي"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                            تفسير وتدبّر
                          </button>
                        </div>

                        {/* Right: Ayah Identifier badge */}
                        <div className="flex items-center gap-2">
                          <span className="font-cairo bg-stone-100 text-stone-600 px-2 py-1 rounded text-[10px]">
                            الجزء {ayah.juz} • الصفحة {ayah.page}
                          </span>
                          <div className="font-sans font-bold bg-emerald-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px]">
                            {ayah.numberInSurah}
                          </div>
                        </div>
                      </div>

                      {/* Arabic Text rendered in luxurious Amiri Font */}
                      <div className="text-right py-2 leading-relaxed">
                        <p
                          className="quran-text text-stone-800 block leading-[2.6] font-normal"
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {displayArabicText}
                        </p>
                      </div>

                      {/* Translating section (optional) */}
                      {showTranslation && (
                        <div className="mt-4 pt-3 border-t border-dashed border-stone-100 text-left">
                          <p className="text-sm text-stone-500 font-sans italic leading-relaxed">
                            {ayah.translation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Floating Feedback Toasts */}
      {feedbackMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 border border-stone-800 text-stone-100 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-2.5 text-xs font-cairo animate-fade-in animate-bounce">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* AI Tafsir Modal Backdrop & Box */}
      {tafsirAyah && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Heading */}
            <div className="bg-emerald-950 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base font-cairo text-amber-300">
                  مُتدبّر القرآن والذكاء الاصطناعي
                </h3>
              </div>
              <button
                onClick={() => setTafsirAyah(null)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-emerald-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal content body */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-4">
              
              {/* Highlight chosen Verse */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 text-right">
                <span className="text-[10px] text-emerald-850 font-cairo">الآية {tafsirAyah.ayahNum} من سورة {surah?.name} :</span>
                <p className="font-amiri text-lg text-stone-800 font-semibold mt-1 leading-relaxed">
                  {tafsirAyah.text}
                </p>
              </div>

              {/* Gen AI response */}
              <div className="text-right space-y-2">
                {tafsirLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Sparkles className="w-7 h-7 text-emerald-700 animate-spin" />
                    <p className="text-stone-500 font-cairo text-xs text-center">
                      جاري صياغة التفسير والتدبر واللطائف اللغوية...
                    </p>
                  </div>
                ) : (
                  <div className="bg-white p-1 rounded-lg">
                    {renderSimpleMarkdown(tafsirContent)}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-stone-50 border-t border-stone-100 p-4 flex justify-between items-center text-xs">
              <button
                onClick={copyTafsirToClipboard}
                disabled={tafsirLoading || !tafsirContent}
                className="flex items-center gap-1 px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 disabled:pointer-events-none font-cairo font-semibold"
              >
                {copiedTafsir ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    نسخ التفسير
                  </>
                )}
              </button>
              
              <button
                onClick={() => setTafsirAyah(null)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg font-cairo"
              >
                إغلاق النافذة
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
