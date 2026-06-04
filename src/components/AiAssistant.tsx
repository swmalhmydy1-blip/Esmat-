/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Sparkles, MessageSquare, Trash2, HelpCircle, Loader2 } from "lucide-react";

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("quran_ai_chat");
    return saved
      ? JSON.parse(saved)
      : [
          {
            role: "model",
            content: `أهلاً بك في **مساعد تدبّر الذكي** ✨. 
            أنا هنا لمساعدتك في تدبر آيات القرآن الكريم وتفسير اللطائف البلاغية واللغوية، والبحث عن آيات السكينة والصبر والهدى والأخلاق الكريمة. 
            
            يمكنك سؤالي عن أي موضوع وسأذكر لك الآيات والمواضع المناسبة من كتاب الله. ماذا تحب أن نتدبر اليوم؟`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [fetching, setFetching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Quick Action Chips
  const promptSuggestions = [
    { label: "آيات السكينة والصبر عند الضيق", text: "اذكر لي أهم آيات السكينة والصبر روقان الروحي عند الشعور بالضيق وتدبّرها" },
    { label: "شرح بلاغات آية الكرسي", text: "اشرح لي عظمة وبلاغة آية الكرسي واللطائف التوحيدية فيها" },
    { label: "قصة أصحاب الكهف وعِبَرها", text: "ما هي العبر الرئيسية المستخلصة من قصة أصحاب الكهف؟" },
    { label: "أهم النصائح لحفظ القرآن", text: "أريد نصائح عملية ومريحة للبدء في حفظ ومراجعة القرآن الكريم بانتظام" }
  ];

  // Auto Scroll to Bottom of comments
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save history
  useEffect(() => {
    localStorage.setItem("quran_ai_chat", JSON.stringify(messages));
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputMessage("");
    setFetching(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: "عذراً يا أخي الكريم، حدثت مشكلة أثناء استدعاء معالج الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (err) {
      console.error("AI Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "عذراً، فشل الاتصال بالخادم. يرجى التأكد من اتصالك بالإنترنت وإعادة التدوير.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setFetching(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("هل أنت متأكد من رغبتك في حذف سجل المحادثات بالكامل؟")) {
      const defaultState = [
        {
          role: "model",
          content: `العفو، تم مسح السجل الدراسي. 
          أهلاً بك مرة أخرى في **مساعد تدبّر الذكي** ✨. أنا مستعد للإجابة على تساؤلاتك ومرافقتك في تدبر كتاب الله العزيز.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ];
      setMessages(defaultState);
      localStorage.setItem("quran_ai_chat", JSON.stringify(defaultState));
    }
  };

  // Safe client-side markdown formatter for chat text
  const renderMessageContent = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let content = line;

      // Header matching
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-emerald-800 text-sm mt-3 mb-1.5 font-cairo">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="font-bold text-emerald-950 text-base mt-4 mb-2 font-cairo pr-2 border-r-2 border-emerald-600">
            {line.replace("## ", "")}
          </h3>
        );
      }

      // Check bold matching: **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIdx = 0;
      let match;
      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIdx) {
          parts.push(content.substring(lastIdx, match.index));
        }
        parts.push(<strong key={match.index} className="text-stone-900 font-bold">{match[1]}</strong>);
        lastIdx = boldRegex.lastIndex;
      }
      if (lastIdx < content.length) {
        parts.push(content.substring(lastIdx));
      }

      // Check markdown bullet points
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
      const cleanLine = line.replace(/^-\s/, "").replace(/^\*\s/, "");

      if (isBullet) {
        return (
          <li key={idx} className="list-disc pr-4 text-xs text-stone-700 leading-relaxed mb-1 text-right">
            {parts.length > 0 ? parts : cleanLine}
          </li>
        );
      }

      return (
        <p key={idx} className="text-xs text-stone-700 leading-relaxed min-h-[0.75rem] my-1 text-right font-cairo">
          {parts.length > 0 ? parts : content}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col h-[650px]" id="ai-assistant-container">
      {/* Banner info */}
      <div className="bg-emerald-950 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-amber-300 text-emerald-950 p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-cairo text-amber-300">مُساعد التدبّر القرآني الذكي</h2>
            <p className="text-[10px] text-stone-300 font-cairo">تعلّم التفسير وأعجب بلطائف البلاغة القرآنية</p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="text-stone-300 hover:text-red-400 p-2 rounded-lg transition-colors hover:bg-emerald-900/40"
          title="حذف السجل"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestion Starter Cards */}
      {messages.length <= 1 && (
        <div className="p-4 bg-emerald-50/50 border-b border-stone-100 shrink-0">
          <span className="text-[10px] text-stone-500 font-bold block mb-2 font-cairo text-right">💡 مقترحات سريعة للتدبّر والحديث:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
            {promptSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.text)}
                className="p-2.5 bg-white border border-stone-150 hover:border-emerald-500 hover:text-emerald-800 rounded-xl text-[11px] font-medium font-cairo text-stone-700 transition-all text-right shadow-xs hover:shadow-sm"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scrolling Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-stone-25/50 space-y-4">
        {messages.map((m, idx) => {
          const isModel = m.role === "model";
          return (
            <div key={idx} className={`flex ${isModel ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs ${
                  isModel
                    ? "bg-stone-50 border border-stone-150 rounded-tr-none text-right"
                    : "bg-emerald-800 text-white rounded-tl-none text-right"
                }`}
              >
                {/* Body */}
                <div className={`space-y-1 ${isModel ? "text-stone-800" : "text-stone-50"}`}>
                  {isModel ? renderMessageContent(m.content) : <p className="text-xs leading-relaxed font-cairo">{m.content}</p>}
                </div>

                {/* Meta details */}
                <p className={`text-[9px] mt-2 block ${isModel ? "text-stone-400" : "text-emerald-300"}`}>
                  {m.timestamp || "اليوم"} • {isModel ? "مُتدبّر" : "أنت"}
                </p>
              </div>
            </div>
          );
        })}

        {/* Loader Status */}
        {fetching && (
          <div className="flex justify-start">
            <div className="bg-stone-50 border border-stone-155 rounded-2xl rounded-tr-none p-4 max-w-[80vw] flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-emerald-700 animate-spin" />
              <p className="text-xs text-stone-500 font-cairo">يتدبّر المساعد في الآيات ليكتب لك أفضل إجابة...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Form Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputMessage);
        }}
        className="p-3 border-t border-stone-100 bg-white flex items-center gap-2.5 shrink-0"
      >
        <button
          type="submit"
          disabled={fetching || !inputMessage.trim()}
          className="bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl p-3 shadow-md disabled:bg-stone-100 disabled:text-stone-400 transition-colors duration-150"
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="اطرح سؤالاً عن القرآن أو اطلب موضعاً لآية كريمة..."
          className="flex-1 pr-4 pl-2 py-3 bg-stone-50 focus:bg-white border border-stone-200 focus:border-emerald-700 rounded-xl outline-none text-xs text-stone-800 transition-all font-cairo text-right placeholder-stone-400"
          disabled={fetching}
        />
      </form>
    </div>
  );
}
