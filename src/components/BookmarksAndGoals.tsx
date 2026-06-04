/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Bookmark, DailyGoal } from "../types";
import { BookMarked, Target, Star, Flame, Calendar, Trash2, ArrowLeft, CheckCircle2 } from "lucide-react";

interface BookmarksAndGoalsProps {
  bookmarks: Bookmark[];
  onRemoveBookmark: (bookmark: Bookmark) => void;
  dailyGoal: DailyGoal;
  onUpdateGoalTarget: (target: number) => void;
  onNavigateToAyah: (surahNumber: number, ayahNumber: number) => void;
}

export default function BookmarksAndGoals({
  bookmarks,
  onRemoveBookmark,
  dailyGoal,
  onUpdateGoalTarget,
  onNavigateToAyah
}: BookmarksAndGoalsProps) {
  const [goalInput, setGoalInput] = useState<string>(dailyGoal.targetAyahs.toString());
  const [showGoalEdit, setShowGoalEdit] = useState(false);

  const percentage = Math.min(100, Math.round((dailyGoal.readToday / dailyGoal.targetAyahs) * 100));

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(goalInput);
    if (!isNaN(val) && val > 0) {
      onUpdateGoalTarget(val);
      setShowGoalEdit(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 md:p-6 space-y-6" id="bookmarks-and-goals">
      
      {/* Grid: Goals Stats on one Side, Streaks on the Other */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Goal Progress Card */}
        <div className="bg-stone-50 border border-stone-150 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
                <Target className="w-4 h-4 text-emerald-850" />
              </span>
              <div>
                <h3 className="font-bold font-cairo text-stone-850 text-xs">الورد اليومي للأوراد</h3>
                <p className="text-[10px] text-stone-400 font-cairo">تحفيز قراءة آيات مباركة يومياً</p>
              </div>
            </div>

            {/* Goal changer */}
            <button
              onClick={() => setShowGoalEdit(!showGoalEdit)}
              className="text-[10px] text-emerald-805 hover:underline font-cairo"
            >
              {showGoalEdit ? "إلغاء" : "تعديل الهدف"}
            </button>
          </div>

          {/* Goal update form */}
          {showGoalEdit ? (
            <form onSubmit={handleGoalSubmit} className="flex gap-2.5 mt-3">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                min="1"
                className="w-16 text-center text-xs py-1 px-2 border rounded border-stone-250 font-sans outline-none focus:border-emerald-700 bg-white"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[10px] font-cairo font-semibold rounded"
              >
                حفظ
              </button>
            </form>
          ) : (
            <div className="mt-4">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[11px] text-stone-500 font-cairo">تم إنجاز آيات لليوم:</span>
                <span className="text-sm font-bold text-emerald-800 font-sans">
                  {dailyGoal.readToday} / {dailyGoal.targetAyahs} آيات
                </span>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                  className="bg-emerald-700 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-stone-400 font-cairo">نسبة الإتمام: {percentage}%</span>
                {percentage >= 100 && (
                  <span className="text-[10px] font-bold text-emerald-700 font-cairo flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 fill-current" /> أحسنت! تم إتمام الورد
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Continuous Daily Streak Board */}
        <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-full text-amber-700 animate-bounce">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h3 className="font-bold font-cairo text-stone-800 text-xs">حماسة الورد وقراءة القرآن</h3>
              <p className="text-[10px] text-stone-400 font-cairo">عدد الأيام المتتالية التي تلوت بها</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-3xl font-extrabold text-amber-600 font-sans">
              {dailyGoal.streak}
            </span>
            <span className="text-xs text-stone-500 block font-cairo">أيام قراءة متواصلة</span>
          </div>
        </div>

      </div>

      {/* Bookmarks System Area */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-cairo text-stone-850 flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-emerald-800" />
          الفواصل والآيات المحفوظة ({bookmarks.length})
        </h3>
        <p className="text-xs text-stone-400 font-cairo">
          انقر فوق أي آية لتقفز إليها وتقرأها مباشرة من وسط المصحف
        </p>

        {/* Scrollable list */}
        <div className="border border-stone-150 rounded-xl divide-y divide-stone-100 overflow-hidden bg-white max-h-[300px] overflow-y-auto pr-1">
          {bookmarks.length > 0 ? (
            bookmarks.slice().reverse().map((b, idx) => (
              <div key={idx} className="p-3 hover:bg-stone-50 group flex items-center justify-between text-right gap-4">
                
                {/* Trash delete button */}
                <button
                  onClick={() => onRemoveBookmark(b)}
                  className="p-1.5 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="حذف الفاصل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Body details text */}
                <button
                  onClick={() => onNavigateToAyah(b.surahNumber, b.ayahNumber)}
                  className="flex-1 text-right focus:outline-none"
                >
                  <div className="flex items-center justify-end gap-2 text-[10px]">
                    <span className="text-stone-400">سورة {b.surahName} (الآية {b.ayahNumber})</span>
                    <span className="font-sans font-bold bg-stone-100 text-stone-600 rounded px-1.5 py-0.5 scale-75">
                      {b.surahNumber}:{b.ayahNumber}
                    </span>
                  </div>
                  
                  {/* Arabic verse text snippet */}
                  <p className="font-amiri text-sm text-stone-800 font-semibold mt-1 max-w-lg truncate leading-relaxed">
                    {b.ayahText}
                  </p>
                </button>

                {/* Arrow pointer icon */}
                <button
                  onClick={() => onNavigateToAyah(b.surahNumber, b.ayahNumber)}
                  className="p-1 text-emerald-800 group-hover:translate-x-1 hover:bg-emerald-50/50 rounded transition-transform"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

              </div>
            ))
          ) : (
            <div className="p-8 text-center text-stone-400 font-cairo text-xs leading-relaxed">
               ليس لديك فواصل محفوظة حالياً. 
              <br />
              <span className="text-[10px] text-stone-400">افتح أي سورة واضغط على زر الفاصل (🔖) لحفظ الآية هنا للعودة السريعة لاحقاً.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
