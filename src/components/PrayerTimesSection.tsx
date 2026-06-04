/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { PrayerTimes, PrayerTimesData } from "../types";
import {
  Clock,
  MapPin,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Navigation,
  Sparkles,
  AlertCircle,
  Play,
  Square,
  Compass,
  CheckCircle2
} from "lucide-react";

// Adhan audio options on Archive.org (fully accessible via open URL structure)
const ADHAN_SOURCES = [
  {
    id: "makkah",
    name: "أذان الحرم المكي الشريف 🕋",
    url: "https://archive.org/download/adhan_202012/Makkah.mp3"
  },
  {
    id: "madinah",
    name: "أذان المسجد النبوي الشريف 🕌",
    url: "https://archive.org/download/adhan_202012/Madinah.mp3"
  },
  {
    id: "alaqsa",
    name: "أذان المسجد الأقصى المبارك 🌙",
    url: "https://archive.org/download/adhan_202012/Al-Aqsa.mp3"
  },
  {
    id: "fajr_makkah",
    name: "أذان الفجر بصوت ندي 🌅",
    url: "https://archive.org/download/adhan_202012/Fajr_Makkah.mp3"
  }
];

// Calculation methods by code
const CALCULATION_METHODS = [
  { id: 4, name: "أم القرى (مكة المكرمة - الخليج)" },
  { id: 5, name: "الهيئة المصرية العامة للمساحة" },
  { id: 3, name: "رابطة العالم الإسلامي" },
  { id: 2, name: "الجمعية الإسلامية لأمريكا الشمالية (ISNA)" },
  { id: 1, name: "جامعة العلوم الإسلامية بكراتشي" },
  { id: 7, name: "معهد الجيوفيزياء بجامعة طهران" },
  { id: 8, name: "طريقة الخليج للضبط التلقائي" }
];

// Presets for Middle Eastern / Global major cities if geolocation is unavailable or denied
const FALLBACK_CITIES = [
  { name: "الرياض، السعودية", lat: 24.7136, lng: 46.6753, timezone: "Asia/Riyadh" },
  { name: "مكة المكرمة، السعودية", lat: 21.3891, lng: 39.8579, timezone: "Asia/Riyadh" },
  { name: "المدينة المنورة، السعودية", lat: 24.4672, lng: 39.6111, timezone: "Asia/Riyadh" },
  { name: "القاهرة، مصر", lat: 30.0444, lng: 31.2357, timezone: "Africa/Cairo" },
  { name: "القدس الشريف، فلسطين", lat: 31.7683, lng: 35.2137, timezone: "Asia/Jerusalem" },
  { name: "دبي، الإمارات", lat: 25.2048, lng: 55.2708, timezone: "Asia/Dubai" },
  { name: "عمان، الأردن", lat: 31.9522, lng: 35.9106, timezone: "Asia/Amman" },
  { name: "بغداد، العراق", lat: 33.3128, lng: 44.3615, timezone: "Asia/Baghdad" },
  { name: "الكويت، دولة الكويت", lat: 29.3759, lng: 47.9774, timezone: "Asia/Kuwait" },
  { name: "المنامة، البحرين", lat: 26.2285, lng: 50.5860, timezone: "Asia/Bahrain" },
  { name: "مسقط، عمان", lat: 23.5859, lng: 58.4059, timezone: "Asia/Muscat" },
  { name: "الدوحة، قطر", lat: 25.2854, lng: 51.5310, timezone: "Asia/Qatar" },
  { name: "صنعاء، اليمن", lat: 15.3694, lng: 44.1910, timezone: "Asia/Aden" },
  { name: "الرباط، المغرب", lat: 34.0209, lng: -6.8416, timezone: "Africa/Casablanca" }
];

interface AlertMessage {
  type: "near" | "now" | "none";
  prayerName: string;
  minutesLeft?: number;
}

export default function PrayerTimesSection() {
  // State for user location coordinates
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 24.7136, // Default Riyadh
    lng: 46.6753
  });
  
  const [cityName, setCityName] = useState<string>("الرياض، المملكة العربية السعودية");
  const [calcMethod, setCalcMethod] = useState<number>(4); // Default Umm Al-Qura
  const [prayerData, setPrayerData] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>("");

  // Settings: Notification sound toggles (Auto Adhan & Countdown alert alerts)
  const [autoAdhanEnabled, setAutoAdhanEnabled] = useState<boolean>(() => {
    return localStorage.getItem("setting_auto_adhan") === "true";
  });
  const [playAlertEnabled, setPlayAlertEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("setting_play_alert");
    return saved === null ? true : saved === "true";
  });
  const [selectedAdhan, setSelectedAdhan] = useState<string>(() => {
    return localStorage.getItem("setting_selected_adhan") || "makkah";
  });

  // Countdown timer indicators represent remaining hours/mins/secs
  const [nextPrayerName, setNextPrayerName] = useState<string>("");
  const [remainingTimeText, setRemainingTimeText] = useState<string>("");
  const [isAdhanPlaying, setIsAdhanPlaying] = useState<boolean>(false);
  const [alertState, setAlertState] = useState<AlertMessage>({ type: "none", prayerName: "" });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  let timeUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load prayer times
  useEffect(() => {
    fetchPrayerTimes();
  }, [coords, calcMethod]);

  // Request browser geolocation on component mount
  useEffect(() => {
    detectLocation();
  }, []);

  // Save configurations on changes
  useEffect(() => {
    localStorage.setItem("setting_auto_adhan", String(autoAdhanEnabled));
  }, [autoAdhanEnabled]);

  useEffect(() => {
    localStorage.setItem("setting_play_alert", String(playAlertEnabled));
  }, [playAlertEnabled]);

  useEffect(() => {
    localStorage.setItem("setting_selected_adhan", selectedAdhan);
    if (isAdhanPlaying && audioRef.current) {
      // If changing adhan while playing, reload new track
      const adhanObj = ADHAN_SOURCES.find((a) => a.id === selectedAdhan) || ADHAN_SOURCES[0];
      const wasPlaying = !audioRef.current.paused;
      audioRef.current.src = adhanObj.url;
      if (wasPlaying) {
        audioRef.current.play().catch(err => console.log("Audio play deferred or failed", err));
      }
    }
  }, [selectedAdhan]);

  // Request notification permissions gracefully
  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  // Run the clock ticking monitor
  useEffect(() => {
    runTickingEngine();
    return () => {
      if (timeUpdateTimer.current) clearInterval(timeUpdateTimer.current);
    };
  }, [prayerData]);

  // Handle active audio destruction on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const detectLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setCityName("الموقع الجغرافي المكتشف تلقائياً");
          setErrorText("");
          // Ask for browser notification permission
          requestNotificationPermission();
        },
        (error) => {
          // Keep Riyadh as default and log alert
          console.warn("Geolocation permission denied or timed out. Defaulting to Riyadh.", error);
          setCoords({ lat: 24.7136, lng: 46.6753 });
          setCityName("الرياض (الضبط التلقائي الاحتياطي)");
        }
      );
    } else {
      setCityName("الرياض (المتصفح لا يدعم تحديد الموقع)");
    }
  };

  const fetchPrayerTimes = async () => {
    setLoading(true);
    setErrorText("");
    try {
      // Use Aladhan API to get times for coordinates
      const response = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${coords.lat}&longitude=${coords.lng}&method=${calcMethod}`
      );
      if (!response.ok) {
        throw new Error("فشل الاتصال بخادم توقيت الصلوات");
      }
      const json = await response.json();
      if (json && json.data) {
        setPrayerData(json.data);
      } else {
        throw new Error("بيانات توقيت الصلاة المستلمة فارغة");
      }
    } catch (err: any) {
      setErrorText("تعذر جلب أوقات الصلاة. يرجى مراجعة اتصال الإنترنت الخاص بك.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "auto") {
      detectLocation();
    } else {
      const parsed = JSON.parse(val);
      setCoords({ lat: parsed.lat, lng: parsed.lng });
      setCityName(parsed.name);
    }
  };

  // Convert "HH:MM (TZ)" or "HH:MM" format to actual today Date object
  const getPrayerDateTime = (timeStr: string): Date => {
    const cleanTime = timeStr.trim().split(" ")[0]; // Take only HH:MM
    const [hrs, mins] = cleanTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hrs, mins, 0, 0);
    return date;
  };

  const prayerNamesMap: { [key: string]: string } = {
    Fajr: "صلاة الفجر",
    Sunrise: "الشروق",
    Dhuhr: "صلاة الظهر",
    Asr: "صلاة العصر",
    Maghrib: "صلاة المغرب",
    Isha: "صلاة العشاء"
  };

  const runTickingEngine = () => {
    if (!prayerData) return;

    if (timeUpdateTimer.current) clearInterval(timeUpdateTimer.current);

    const checkTimes = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();

      const timings = prayerData.timings;
      
      // Map out all today's times
      const prayerList = Object.keys(prayerNamesMap).map((key) => {
        const timeStr = timings[key as keyof PrayerTimes];
        const prayDate = getPrayerDateTime(timeStr);
        return {
          key,
          name: prayerNamesMap[key],
          time: prayDate
        };
      });

      // Sort chronological
      prayerList.sort((a, b) => a.time.getTime() - b.time.getTime());

      // Find the upcoming one
      let upcoming = prayerList.find((p) => p.time.getTime() > now.getTime());
      let nextDay = false;

      // If no upcoming today, then it's Fajr of tomorrow
      if (!upcoming) {
        upcoming = prayerList.find((p) => p.key === "Fajr");
        if (upcoming) {
          const tomorrowFajrDate = new Date(upcoming.time.getTime() + 24 * 60 * 60 * 1000);
          upcoming = {
            ...upcoming,
            time: tomorrowFajrDate
          };
          nextDay = true;
        }
      }

      if (!upcoming) return;

      setNextPrayerName(upcoming.name);

      // Calc remaining diff milliseconds
      const diffMs = upcoming.time.getTime() - now.getTime();
      const totalSeconds = Math.floor(diffMs / 1000);

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Format remaining time text string
      const hrsStr = hours > 0 ? `${hours}س : ` : "";
      const minsStr = `${minutes}د : `;
      const secsStr = `${seconds}ث`;
      setRemainingTimeText(`${hrsStr}${minsStr}${secsStr}`);

      // Handle Near Prayer Warning notifications (15 minutes or less)
      const minutesLeftTotal = Math.floor(totalSeconds / 60);
      if (minutesLeftTotal === 15 && seconds === 0) {
        triggerNotification(`اقترب وقت الصلاة`, `متبقي ١٥ دقيقة على رفع أذان (${upcoming.name})`);
        setAlertState({ type: "near", prayerName: upcoming.name, minutesLeft: 15 });
      } else if (minutesLeftTotal === 5 && seconds === 0) {
        triggerNotification(`تنبيه بالورد والتهيئة`, `متبقي ٥ دقائق لأذان (${upcoming.name}). حان وقت الوضوء.`);
        setAlertState({ type: "near", prayerName: upcoming.name, minutesLeft: 5 });
      }

      // Trigger actual Adhan precisely when countdown hits 0
      if (totalSeconds === 0) {
        setAlertState({ type: "now", prayerName: upcoming.name });
        triggerPlayAdhanAutomatically(upcoming.key, upcoming.name);
      }
    };

    checkTimes();
    timeUpdateTimer.current = setInterval(checkTimes, 1000);
  };

  const triggerNotification = (title: string, body: string) => {
    if (!playAlertEnabled) return;

    // Send visual browser alert if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`عصمت الإسلامي: ${title}`, {
        body,
        icon: "https://archive.org/download/adhan_202012/mosque_icon.png"
      });
    }

    // Try a sweet synthesized beep
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 musical note
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.log("Web audio play failed", e);
    }
  };

  const triggerPlayAdhanAutomatically = (prayerKey: string, prayerName: string) => {
    triggerNotification(`حان الآن موعد الأذان`, `نداء حي على الصلاة لـ (${prayerName})`);

    // Don't play adhan sound during sunrise
    if (prayerKey === "Sunrise") return;

    if (autoAdhanEnabled) {
      playAdhanSound();
    }
  };

  const playAdhanSound = () => {
    try {
      const adhanObj = ADHAN_SOURCES.find((a) => a.id === selectedAdhan) || ADHAN_SOURCES[0];
      
      if (!audioRef.current) {
        audioRef.current = new Audio(adhanObj.url);
      } else {
        audioRef.current.pause();
        audioRef.current.src = adhanObj.url;
      }

      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.volume = 0.95;
      
      setIsAdhanPlaying(true);
      
      audioRef.current.play()
        .then(() => {
          console.log("Playing adhan successfully");
        })
        .catch((err) => {
          console.warn("Autoplay block. Needs user interaction.", err);
          setIsAdhanPlaying(false);
          alert("تنبيه: محرك المتصفح يمنع التشغيل التلقائي قبل تفاعل المستخدم. اضغط على 'تشغيل تجريبي' بالسفل لتمكين الصوت بالكامل!");
        });

      // Reset state when prayer audio ends
      audioRef.current.onended = () => {
        setIsAdhanPlaying(false);
      };
    } catch (err) {
      console.error(err);
      setIsAdhanPlaying(false);
    }
  };

  const stopAdhanSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsAdhanPlaying(false);
    setAlertState({ type: "none", prayerName: "" });
  };

  // Human readable time clean helper to strip timezone noise
  const cleanPrayerTimeDisplay = (timeStr: string) => {
    return timeStr.split(" ")[0]; // Returns just HH:MM
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 md:p-6 space-y-6" id="prayer-times-system">
      
      {/* Visual indicator alert if prayer is here/now */}
      {alertState.type !== "none" && (
        <div className="bg-emerald-800 text-white p-4 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="text-right">
              <span className="font-bold text-xs block font-cairo">
                {alertState.type === "now" ? "حان وقت الصلاة الآن! 🕋" : "تنبيه بالورد والعبادة 🛎️"}
              </span>
              <p className="text-[11px] opacity-90 font-cairo">
                {alertState.type === "now"
                  ? `أذان ${alertState.prayerName} يرفع الآن بمحيطك.`
                  : `متبقي ${alertState.minutesLeft} دقائق على موعد أذان ${alertState.prayerName}.`}
              </p>
            </div>
          </div>
          {isAdhanPlaying && (
            <button
              onClick={stopAdhanSound}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-cairo mr-2"
            >
              إيقاف الأذان 🔇
            </button>
          )}
        </div>
      )}

      {/* Main interactive control cluster */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-stone-100 pb-5">
        
        {/* City name detection info */}
        <div className="text-right flex-1 w-full space-y-1">
          <h3 className="font-bold font-cairo text-stone-850 text-sm flex items-center gap-1.5 justify-end">
            <span>مواقيت الصلاة الشرعية</span>
            <Clock className="w-4 h-4 text-emerald-800" />
          </h3>
          <p className="text-[11px] text-stone-400 font-cairo flex items-center gap-1 justify-end">
            <span className="font-semibold text-emerald-800">{cityName}</span>
            <MapPin className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* Location selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            onChange={handleCityChange}
            defaultValue="auto"
            className="flex-1 md:flex-none text-xs font-cairo bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-right outline-none focus:border-emerald-700 focus:bg-white text-stone-700"
          >
            <option value="auto">📍 البحث التلقائي بالموقع المباشر</option>
            {FALLBACK_CITIES.map((c, i) => (
              <option key={i} value={JSON.stringify({ name: c.name, lat: c.lat, lng: c.lng })}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={detectLocation}
            title="إعادة الكشف التلقائي عن الموقع"
            className="p-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl transition-all"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

      </div>

      {loading ? (
        <div className="py-12 text-center text-stone-400 font-cairo text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>جاري فحص موقعك بدقة وتحميل مواقيت الصلاة المباركة...</p>
        </div>
      ) : errorText ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center text-xs font-cairo border border-red-100 flex flex-col items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p>{errorText}</p>
          <button
            onClick={fetchPrayerTimes}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded font-semibold transition-colors"
          >
            إعادة التجربة
          </button>
        </div>
      ) : (
        prayerData && (
          <div className="space-y-6">
            
            {/* BIG COUNTDOWN CARD */}
            <div className="bg-gradient-to-l from-emerald-900 via-teal-950 to-stone-900 text-white rounded-2xl p-5 border border-emerald-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 text-right">
              
              <div className="space-y-1">
                <span className="text-[10px] bg-emerald-800/80 text-amber-200 font-cairo font-semibold px-2 py-0.5 rounded">
                  الآذان القادم بحسب منطقتك
                </span>
                <h4 className="text-base font-bold font-cairo">
                  {nextPrayerName || "تحميل الفريضة التالية..."}
                </h4>
              </div>

              <div className="text-center md:text-left">
                <span className="text-2xl font-black font-sans text-amber-300 block tracking-wider">
                  {remainingTimeText || "00:00:00"}
                </span>
                <span className="text-[10px] text-stone-300 block font-cairo">المتبقي لرفع نداء الحق</span>
              </div>

            </div>

            {/* Prayers bento layout structure */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {Object.keys(prayerNamesMap).map((key) => {
                const isNext = prayerNamesMap[key] === nextPrayerName;
                const timeStr = prayerData.timings[key as keyof PrayerTimes];
                
                return (
                  <div
                    key={key}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      isNext
                        ? "bg-amber-50/50 border-amber-300 shadow-xs scale-102 ring-1 ring-amber-200"
                        : "bg-stone-50/60 border-stone-100"
                    }`}
                  >
                    <span className={`text-[10px] block font-cairo ${isNext ? "font-bold text-amber-80 * 2 text-emerald-850" : "text-stone-400"}`}>
                      {prayerNamesMap[key]}
                    </span>
                    <span className="text-base font-black font-sans text-stone-850 block mt-1">
                      {cleanPrayerTimeDisplay(timeStr)}
                    </span>
                    
                    {isNext && (
                      <span className="text-[8px] font-bold text-amber-700 font-cairo bg-amber-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                        الآذان التالي
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AUTOMATIC ADHAN SOUND CONFIG */}
            <div className="bg-stone-50 border border-stone-150 p-4 rounded-xl space-y-4 text-right">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-200/60 pb-3">
                
                {/* Audio voice reciter preset chooser */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedAdhan}
                    onChange={(e) => setSelectedAdhan(e.target.value)}
                    className="text-xs font-cairo bg-white border border-stone-250 rounded-lg px-2.5 py-1.5 focus:border-emerald-700 outline-none text-right text-stone-700"
                  >
                    {ADHAN_SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-stone-400 font-cairo">صوت الآذان:</span>
                </div>

                <div className="text-right">
                  <h4 className="font-bold text-stone-800 text-xs font-cairo flex items-center gap-1.5 justify-end">
                    <span>منبه الآذان الصوتي</span>
                    <Volume2 className="w-4 h-4 text-emerald-850" />
                  </h4>
                </div>

              </div>

              {/* Toggles cluster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Auto play toggle */}
                <div className="bg-white p-3 rounded-lg border border-stone-150 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setAutoAdhanEnabled(!autoAdhanEnabled);
                      requestNotificationPermission();
                    }}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-150 outline-none ${
                      autoAdhanEnabled ? "bg-emerald-700 justify-end" : "bg-stone-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-150"></span>
                  </button>
                  
                  <div className="text-right">
                    <span className="text-xs font-bold text-stone-800 font-cairo block">الآذان التلقائي الصوتي</span>
                    <span className="text-[9px] text-stone-400 font-cairo">تشغيل صوت الأذان فور دخول الوقت</span>
                  </div>
                </div>

                {/* Warning near toggle */}
                <div className="bg-white p-3 rounded-lg border border-stone-150 flex items-center justify-between">
                  <button
                    onClick={() => setPlayAlertEnabled(!playAlertEnabled)}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-150 outline-none ${
                      playAlertEnabled ? "bg-emerald-700 justify-end" : "bg-stone-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-150"></span>
                  </button>
                  
                  <div className="text-right">
                    <span className="text-xs font-bold text-stone-800 font-cairo block">التنبيه عند اقتراب الوقت</span>
                    <span className="text-[9px] text-stone-400 font-cairo">إشعار صوتي خفيف مسبق بـ ١٥ و ٥ دقائق</span>
                  </div>
                </div>

              </div>

              {/* Test play cluster */}
              <div className="flex flex-wrap items-center justify-between bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100 gap-2">
                <div className="flex items-center gap-1.5">
                  {isAdhanPlaying ? (
                    <button
                      onClick={stopAdhanSound}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-cairo font-bold flex items-center gap-1 transition-all"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      إيقاف التشغيل
                    </button>
                  ) : (
                    <button
                      onClick={playAdhanSound}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-cairo font-bold flex items-center gap-1 transition-all shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      تشغيل تجريبي
                    </button>
                  )}
                </div>

                <p className="text-[9px] text-emerald-850 font-cairo max-w-xs text-right leading-relaxed">
                   * يمكنك اختبار الصوت للتأكد من سماحه للعمل بالمتصفح، حيث يمتثل لسياسات صوت التفاعل بالمتصفح.
                </p>
              </div>

            </div>

            {/* Calculations settings info panel */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-stone-100 pt-4 font-cairo text-stone-400">
              
              <div className="flex items-center gap-2">
                <select
                  value={calcMethod}
                  onChange={(e) => setCalcMethod(Number(e.target.value))}
                  className="text-[10px] font-cairo bg-stone-50 border border-stone-200 rounded px-2 py-1 outline-none text-right"
                >
                  {CALCULATION_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px]">طريقة الحساب:</span>
              </div>

              <div className="text-center sm:text-right text-[10px]">
                <span>الحساب الحالي: طريقة {CALCULATION_METHODS.find((m) => m.id === calcMethod)?.name}</span>
              </div>

            </div>

          </div>
        )
      )}

    </div>
  );
}
