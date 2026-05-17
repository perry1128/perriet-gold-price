"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Send, X, Sparkles } from "lucide-react";

interface Props {
  currentPrice: number;
  globalPrice: number;
  exchangeRate: number;
  lang: "en" | "zh";
}

const quickPrompts = {
  en: [
    { icon: "📊", label: "Today's market analysis" },
    { icon: "📈", label: "Short-term trend outlook" },
    { icon: "💡", label: "Is it a good time to buy gold?" },
  ],
  zh: [
    { icon: "📊", label: "今日金市分析" },
    { icon: "📈", label: "短期黄金走势" },
    { icon: "💡", label: "现在适合买黄金吗？" },
  ],
};

const t = {
  en: {
    title: "Gold AI Assistant",
    placeholder: "Ask about gold prices...",
    disclaimer: "AI-generated content, for reference only. Not investment advice.",
    empty: "Ask me anything about gold! Try a quick prompt below.",
  },
  zh: {
    title: "黄金 AI 助手",
    placeholder: "咨询黄金价格...",
    disclaimer: "AI 生成内容，仅供参考，不构成投资建议。",
    empty: "随时问我关于黄金的问题！试试下面的快捷提示。",
  },
};

export default function AIAssistant({ currentPrice, globalPrice, exchangeRate, lang }: Props) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pricesRef = useRef({ currentPrice, globalPrice, exchangeRate });
  pricesRef.current = { currentPrice, globalPrice, exchangeRate };

  // Drag state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const hasMoved = useRef(false);
  const DRAG_THRESHOLD = 5;

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const tr = t[lang];
  const prompts = quickPrompts[lang];

  const sendWithPrices = useCallback(
    (text: string) => {
      sendMessage({ text }, { body: { ...pricesRef.current } });
    },
    [sendMessage]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("prompt") as HTMLInputElement;
    const text = input.value.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    sendWithPrices(text);
    input.value = "";
  };

  const handleQuickPrompt = (label: string) => {
    if (status === "streaming" || status === "submitted") return;
    sendWithPrices(label);
  };

  // Pointer drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      hasMoved.current = true;
    }
    const BOT = 56;
    const MARGIN = 16;
    const maxX = window.innerWidth - BOT - MARGIN;
    const maxY = window.innerHeight - BOT - MARGIN;
    setPos({
      x: Math.max(MARGIN - maxX, Math.min(MARGIN, dragStart.current.px + dx)),
      y: Math.max(MARGIN - maxY, Math.min(MARGIN, dragStart.current.py + dy)),
    });
  };

  const onPointerUp = () => {
    dragging.current = false;
    if (!hasMoved.current) {
      setOpen((prev) => !prev);
    }
  };

  return (
    <>
      {/* Floating Bot Icon */}
      <motion.button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="fixed z-50 w-14 h-14 rounded-full bg-amber-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center active:bg-amber-400 transition-colors select-none touch-none"
        style={{
          right: `calc(1.5rem - ${pos.x}px)`,
          bottom: `calc(1.5rem - ${pos.y}px)`,
        }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 1 }}
      >
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Bot className="w-7 h-7 text-black" />
        </motion.div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm h-[520px] max-h-[calc(100vh-8rem)] rounded-2xl border border-amber-500/30 bg-black/70 backdrop-blur-xl shadow-[0_0_40px_rgba(234,179,8,0.08)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-700/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400">{tr.title}</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-amber-600 hover:text-amber-400 hover:bg-amber-950/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-amber-600/80 mt-4">{tr.empty}</p>
              )}
              {messages.map((m) => {
                const textParts = m.parts.filter((p): p is { type: "text"; text: string } => p.type === "text");
                const text = textParts.map((p) => p.text).join("");
                if (!text) return null;
                return (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-amber-600/20 border border-amber-500/30 text-amber-200"
                          : "bg-zinc-900/80 border border-zinc-700/30 text-zinc-200"
                      }`}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
              {(status === "streaming" || status === "submitted") && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3 py-2 bg-zinc-900/80 border border-zinc-700/30">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="text-amber-400 text-sm"
                    >
                      ●●●
                    </motion.span>
                  </div>
                </div>
              )}
              {error && (
                <p className="text-center text-xs text-red-400">Error: {error.message}</p>
              )}
            </div>

            {/* Quick Prompts */}
            {messages.length === 0 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {prompts.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleQuickPrompt(p.label)}
                    className="shrink-0 rounded-full border border-amber-700/40 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-400 hover:border-amber-500 hover:bg-amber-950/50 transition-colors whitespace-nowrap"
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 border-t border-amber-700/30"
            >
              <input
                name="prompt"
                placeholder={tr.placeholder}
                className="flex-1 rounded-xl border border-amber-700/40 bg-black/50 px-3 py-2 text-sm text-amber-200 placeholder-amber-700 outline-none focus:border-amber-500 transition-colors"
                disabled={status === "streaming" || status === "submitted"}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={status === "streaming" || status === "submitted"}
                className="rounded-full p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Disclaimer */}
            <p className="px-4 pb-2 text-[10px] text-amber-700/60 text-center">{tr.disclaimer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
