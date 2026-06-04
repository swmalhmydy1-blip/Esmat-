/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SurahMetadata {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
  revelationOrder?: number;
}

export interface Ayah {
  number: number;
  audio?: string;
  audioSecondary?: string[];
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  translation?: string;
}

export interface SurahDetail extends SurahMetadata {
  ayahs: Ayah[];
  edition?: {
    identifier: string;
    language: string;
    name: string;
    englishName: string;
    format: string;
    type: string;
    direction: string;
  };
}

export interface Reciter {
  id: string;
  name: string;
  arabicName: string;
  style: string;
  serverUrl: string; // Base URL for recitation
}

export interface Bookmark {
  surahNumber: number;
  surahName: string;
  ayahNumber: number; // number in Surah
  ayahText: string;
  timestamp: number;
}

export interface DailyGoal {
  targetAyahs: number;
  readToday: number;
  streak: number;
  lastReadDate: string; // YYYY-MM-DD
}

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface DhikrItem {
  id: string;
  text: string;
  count: number; // Target repeat count
  currentCount?: number; // User counter progress
  benefit?: string; // Virtue / benefit of the supplication
}

export interface DhikrCategory {
  id: string;
  name: string;
  icon: string;
  items: DhikrItem[];
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface PrayerTimesData {
  timings: PrayerTimes;
  date: {
    readable: string;
    gregorian: {
      date: string;
      day: string;
      weekday: { en: string };
      month: { number: number; en: string };
      year: string;
    };
    hijri: {
      date: string;
      day: string;
      weekday: { en: string; ar: string };
      month: { number: number; en: string; ar: string };
      year: string;
    };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
    };
  };
}

