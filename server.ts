/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// 1. API: Get AI-powered Tafsir and reflection
app.post("/api/gemini/tafsir", async (req, res) => {
  const { surahNumber, surahName, ayahNumber, ayahText, translation } = req.body;

  if (!surahNumber || !ayahNumber || !ayahText) {
    return res.status(400).json({ error: "Missing required ayah parameters." });
  }

  const prompt = `
  You are an expert Islamic scholar and Quran interpreter. Provide a deep, beautiful, and inspiring Tafsir (explanation) primarily in Arabic for the following ayah.
  
  Surah: ${surahName} (Surah Number: ${surahNumber})
  Ayah Number: ${ayahNumber}
  Arabic Text: "${ayahText}"
  English Translation: "${translation || ''}"

  Please write a beautifully structured response in Arabic using Markdown. Do not include introductory conversational filler. Start directly with the tafsir structure:
  
  ### 📖 شرح الآية الكريمة (سورة ${surahName} - آية ${ayahNumber})
  
  1. **المعنى العام والتدبّر**:
     (شرح مبسط ومريح للقلب لمعنى الآية وسياقها)
     
  2. **شرح المفردات واللطائف اللغوية**:
     (تبيان معاني الكلمات الرئيسية والجماليات اللغوية والبلاغية في الآية)
     
  3. **الدروس والفوائد العملية لحياتنا**:
     (كيف نطبق هذه الآية في حياتنا اليومية لزيادة الإيمان والسكينة - 3 نقاط واضحة)

  Please maintain an elegant, scholarly, and deeply respectful tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ tafsir: response.text });
  } catch (error: any) {
    console.error("Gemini Tafsir error:", error);
    res.status(500).json({ error: "Failed to generate Tafsir. Please try again." });
  }
});

// 2. API: Chat with Quran Specialist companion
app.post("/api/gemini/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array." });
  }

  // Format history for Gemini chat structure
  // System Instruction helps keep the bot context-focused as a comforting Quranic/spiritual advisor.
  const systemInstruction = `
  أنت 'مُتدبّر ومُرشد' - مساعد إسلامي ذكي متخصص في تدبر القرآن الكريم، وتفسير الآيات، ومساعدة المسلم في البحث عن الطمأنينة الهداية والسكينة من خلال آيات الله والأحاديث الصحيحة.
  
  التعليمات والضوابط:
  - أجب بوقار وأدب جم وبأسلوب رقيق مريح للنفس يبعث الطمأنينة والأمل والسكينة.
  - تجنب الدخول في الفتاوى الفقهية المعقدة أو الخلافات المذهبية، وركز على التوجيه القرآني الأخلاقي والروحي.
  - عندما يطلب منك المستخدم العثور على آيات تتحدث عن موضوع معين (كالصبر، الصلاة، التوكل، الرزق، الحزن)، اذكر الآيات بوضوح مبيناً السورة ورقم الآية مع تقديم شرح ميسر وتدبر ملهم وجميل لها.
  - استخدم اللغة العربية الفصحى بشكل أساسي وإذا حدثك المستخدم بلغة أخرى فأجبه بنفس لغته.
  - استغل ميزات التنسيق في Markdown لجعل الإجابة مرتبة وسهلة القراءة ومريحة للعين.
  `;

  try {
    // Map current message history
    const contents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
      },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Gemini Chat error:", error);
    res.status(500).json({ error: "Failed to process chat response. Please try again." });
  }
});

// 3. Vite development middleware / Static production build routing
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Quran Dev Server] Running on http://localhost:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to boot server:", err);
});
