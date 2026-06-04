/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { adhkarData } from "../data/adhkarData";
import { DhikrCategory, DhikrItem } from "../types";
import { Sun, Moon, ShieldCheck, Heart, RotateCcw, AlertCircle, Plus, CheckCircle2, Sparkles } from "lucide-react";

export default function AdhkarSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("morning");
  
  // Track local states of counts to prevent reset on tab changes or browser reloads (localStorage)
  const [counts, setCounts] = useState<{ [key: string]: number }>(() => {
    const saved = localStorage.getItem("adhkar_user_progress");
    return saved ? JSON.parse(saved) : {};
  });

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Sun":
        return <Sun className="w-5 h-5 text-amber-500" />;
      case "Moon":
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case "Heart":
        return <Heart className="w-5 h-5 text-rose-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  // Find currently active category
  const activeCategory = adhkarData.find((cat) => cat.id === selectedCategory) || adhkarData[0];

  // Handle count increments
  const handleDhikrProgress = (dhikrId: string, maxCount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = counts[dhikrId] || 0;
    if (current >= maxCount) return; // already done

    const nextCount = current + 1;
    const updated = { ...counts, [dhikrId]: nextCount };
    setCounts(updated);
    localStorage.setItem("adhkar_user_progress", JSON.stringify(updated));

    // Support delicate browser haptic vibration feedback where supported
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  // Reset a specific dhikr or the entire category
  const handleResetDhikr = (dhikrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...counts };
    delete updated[dhikrId];
    setCounts(updated);
    localStorage.setItem("adhkar_user_progress", JSON.stringify(updated));
  };

  const handleResetAllCategory = () => {
    if (window.confirm("هل ترغب في إعادة ضبط عداد الأذكار لهذه المجموعة بالكامل للبدء مجدداً؟")) {
      const updated = { ...counts };
      activeCategory.items.forEach((item) => {
        delete updated[item.id];
      });
      setCounts(updated);
      localStorage.setItem("adhkar_user_progress", JSON.stringify(updated));
    }
  };

  // Dedicated custom Tasbeeh state 
  const [customTasbeeh, setCustomTasbeeh] = useState<number>(() => {
    const saved = localStorage.getItem("custom_tasbeeh_total");
    return saved ? parseInt(saved) : 0;
  });

  const handleCustomTasbeehIncrement = () => {
    const nextVal = customTasbeeh + 1;
    setCustomTasbeeh(nextVal);
    localStorage.setItem("custom_tasbeeh_total", nextVal.toString());
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
  };

  const handleCustomTasbeehReset = () => {
    if (window.confirm("هل تريد تصفير المسبحة الإلكترونية الحرة؟")) {
      setCustomTasbeeh(0);
      localStorage.setItem("custom_tasbeeh_total", "0");
    }
  };

  return (
    <div className="space-y-6" id="adhkar-main-view">
      
      {/* Category selector row cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {adhkarData.map((category) => {
          const isActive = selectedCategory === category.id;
          
          // Calculate done items ratio
          const loggedCounts = category.items.filter((item) => {
            const userProgress = counts[item.id] || 0;
            return userProgress >= item.count;
          }).length;
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between h-24 shadow-xs hover:shadow group ${
                isActive
                  ? "border-emerald-700 bg-emerald-50/50 shadow-sm"
                  : "border-stone-150 bg-white hover:border-emerald-400"
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className={`p-1.5 rounded-lg ${isActive ? "bg-emerald-100" : "bg-stone-50"}`}>
                  {getCategoryIcon(category.icon)}
                </span>
                <span className="text-[10px] font-sans text-stone-400 font-bold">
                  {loggedCounts}/{category.items.length} منجز
                </span>
              </div>
              <span className={`text-xs font-bold font-cairo mt-2 ${isActive ? "text-emerald-950" : "text-stone-700"}`}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Core items section list (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Header title */}
          <div className="bg-white border border-stone-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
            <div className="text-right">
              <h2 className="text-base font-bold text-stone-850 font-cairo flex items-center gap-1.5">
                {getCategoryIcon(activeCategory.icon)}
                {activeCategory.name}
              </h2>
              <p className="text-[10px] text-stone-400 mt-0.5">
                اضغط على بطاقة الذكر أو الدائرة باليسار لتسجيل التكرار المنجز
              </p>
            </div>
            
            <button
              onClick={handleResetAllCategory}
              className="text-stone-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-cairo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              تصفير المجموعة
            </button>
          </div>

          {/* Adhkar interactive cards list */}
          <div className="space-y-3.5">
            {activeCategory.items.map((item) => {
              const current = counts[item.id] || 0;
              const isCompleted = current >= item.count;
              const percentage = Math.min(100, Math.round((current / item.count) * 100));

              return (
                <div
                  key={item.id}
                  onClick={(e) => handleDhikrProgress(item.id, item.count, e)}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer select-none relative group overflow-hidden ${
                    isCompleted
                      ? "bg-emerald-50/30 border-emerald-300/80 shadow-xs"
                      : "bg-white border-stone-100 hover:shadow-sm hover:border-emerald-500/50"
                  }`}
                >
                  {/* Completeness visual backdrop ribbon */}
                  {isCompleted && (
                    <div className="absolute top-0 right-0 h-1.5 bg-emerald-600 rounded-bl" style={{ width: "100%" }}></div>
                  )}

                  <div className="flex flex-col md:flex-row items-center gap-5 justify-between">
                    
                    {/* Left circular tap counters */}
                    <div className="flex items-center gap-3 shrink-0">
                      
                      {/* Reset single dhikr */}
                      {current > 0 && (
                        <button
                          onClick={(e) => handleResetDhikr(item.id, e)}
                          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                          title="تصفير هذا الذكر"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Tap target container */}
                      <div
                        className={`w-14 h-14 rounded-full flex flex-col justify-center items-center font-sans tracking-tight transition-transform group-active:scale-95 border-2 relative ${
                          isCompleted
                            ? "bg-emerald-600 border-emerald-500 text-white animate-bounce-short"
                            : "bg-stone-50 border-stone-200 text-stone-800"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 fill-current" />
                        ) : (
                          <>
                            <span className="text-xs font-semibold leading-none">{item.count - current}</span>
                            <span className="text-[8px] opacity-60 font-medium font-cairo mt-0.5">متبقي</span>
                          </>
                        )}
                        
                        {/* Circular Progress Overlay */}
                        <div
                          className="absolute inset-0 rounded-full border border-dashed border-emerald-800 pointer-events-none opacity-20"
                          style={{ clipPath: `polygon(50% 50%, -50% -50%, ${percentage}% -50%)` }}
                        ></div>
                      </div>
                    </div>

                    {/* Right text panel */}
                    <div className="flex-1 text-right space-y-2">
                      <p className="quran-text text-stone-800 text-base md:text-lg tracking-wide leading-relaxed font-semibold">
                        {item.text}
                      </p>
                      
                      {item.benefit && (
                        <div className="flex items-start gap-1 justify-end pt-2 border-t border-dashed border-stone-100">
                          <span className="text-[10px] text-stone-400 font-cairo text-right pr-2">
                             {item.benefit}
                          </span>
                          <AlertCircle className="w-3 h-3 text-emerald-800 shrink-0 mt-0.5" />
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Tiny progress ratio on the bottom */}
                  <div className="mt-3 flex justify-between items-center text-[10px] text-stone-400 font-sans">
                    <span>التكرار المستهدف: {item.count}</span>
                    <span className="font-semibold text-emerald-805">المنجز: {current} ({percentage}%)</span>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* Free standalone electronic Tasbeeh (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-stone-950 text-white rounded-2xl p-6 border border-emerald-900 shadow-xl space-y-5 relative overflow-hidden text-center">
            
            {/* Islamic motif background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none"></div>

            <div className="relative z-10 space-y-1">
              <h3 className="font-bold text-sm font-cairo text-amber-300">الْـمِسْبَحَةُ الإِلِكْـتِرُونِيَّة</h3>
              <p className="text-[10px] text-stone-300">مسبحة حرة للتسبيح والاستغفار في أي مكان</p>
            </div>

            {/* Glowing counter bubble */}
            <div className="w-36 h-36 mx-auto rounded-full bg-emerald-900/40 relative flex flex-col justify-center items-center border border-emerald-800 shadow-inner group relative z-10">
              <span className="text-4xl font-extrabold font-sans text-amber-300 tracking-wide">
                {customTasbeeh}
              </span>
              <span className="text-[10px] text-stone-300 tracking-widest font-cairo mt-1">تَسْبِيحَة</span>
            </div>

            {/* Click to count trigger button style */}
            <button
              onClick={handleCustomTasbeehIncrement}
              className="w-full bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl py-3.5 shadow-md transition-all active:scale-95 text-xs font-cairo flex items-center justify-center gap-2 relative z-10"
            >
              <Plus className="w-4 h-4 text-stone-900" />
              اضغط للتسبيح
            </button>

            {/* Reset button counter */}
            {customTasbeeh > 0 && (
              <button
                onClick={handleCustomTasbeehReset}
                className="text-stone-300 hover:text-white transition-colors duration-150 text-[10px] font-cairo flex items-center gap-1 mx-auto justify-center"
              >
                <RotateCcw className="w-3 h-3" />
                تصفير المسبحة
              </button>
            )}

            {/* Quick pre-set spiritual targets */}
            <div className="border-t border-emerald-900/50 pt-3.5 grid grid-cols-3 gap-1.5 text-[9px] relative z-10 font-cairo text-stone-300">
              <button
                onClick={() => {
                  setCustomTasbeeh((prev) => prev + 33);
                  localStorage.setItem("custom_tasbeeh_total", (customTasbeeh + 33).toString());
                }}
                className="py-1 px-2 bg-emerald-900/60 rounded border border-emerald-800 hover:text-white"
              >
                +٣٣ تكرار
              </button>
              <button
                onClick={() => {
                  setCustomTasbeeh((prev) => prev + 100);
                  localStorage.setItem("custom_tasbeeh_total", (customTasbeeh + 100).toString());
                }}
                className="py-1 px-2 bg-emerald-900/60 rounded border border-emerald-800 hover:text-white"
              >
                +١٠٠ تكرار
              </button>
              <button
                onClick={() => {
                  setCustomTasbeeh((prev) => prev + 1000);
                  localStorage.setItem("custom_tasbeeh_total", (customTasbeeh + 1000).toString());
                }}
                className="py-1 px-2 bg-emerald-900/60 rounded border border-emerald-800 hover:text-white"
              >
                +١٠٠٠ تكرار
              </button>
            </div>

          </div>

          {/* Golden tips */}
          <div className="bg-amber-50/30 border border-amber-200/40 rounded-2xl p-4 text-right">
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded leading-none font-cairo">فضل الذكر:</span>
            <p className="text-[11px] text-stone-605 font-cairo mt-2 leading-relaxed">
               قال النبي محمد ﷺ: «ألا أنبئكم بخير أعمالكم، وأزكاها عند مليككم، وأرفعها في درجاتكم... قالوا: بلى، قال: ذكر الله تعالى».
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
