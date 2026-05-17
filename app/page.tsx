"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import AIAssistant from "../components/AIAssistant";
import GoldParticles from "../components/GoldParticles";
import { useRipple } from "../components/RippleEffect";

type Lang = "en" | "zh";
type ChartRange = "2m" | "1y";
type CalcMode = "grams" | "price";

const t = {
  en: {
    title: "AU9999 Gold Market",
    intlTitle: "XAU/USD",
    intlUnit: "USD/oz",
    changeLabel: "Daily Change",
    jewelry: "Jewelry Retail",
    bank: "Bank Gold Savings",
    recycle: "Gold Recycling",
    chartTitle2m: "2-Month Trend",
    chartTitle1y: "1-Year Trend",
    swipeHint: "Swipe to scroll",
    calculator: "Quick Calculator",
    grams: "g",
    yuan: "¥",
    total: "Total",
    dashboard: "Today's Dashboard",
    volatility: "Volatility",
    todayHigh: "High",
    todayLow: "Low",
    support: "Support",
    resistance: "Resistance",
    premiumTable: "Physical Gold Premium",
    rawMaterial: "AU9999 Spot",
    bankBar: "Bank Bar",
    brandJewelry: "Brand Jewelry",
    autoRefresh: "Auto-refresh every hour",
    countdown: "Next update",
    error: "Failed to load data",
    fxRate: "FX Rate",
    dataSource: "Data: Shanghai Gold Exchange (ref.)",
  },
  zh: {
    title: "AU9999 万足金行情",
    intlTitle: "国际金价",
    intlUnit: "USD/oz",
    changeLabel: "日内涨跌",
    jewelry: "金店首饰参考",
    bank: "银行积存金",
    recycle: "黄金回收价",
    chartTitle2m: "近两月走势",
    chartTitle1y: "近一年走势",
    swipeHint: "左右滑动查看",
    calculator: "快速计算",
    grams: "克",
    yuan: "元",
    total: "总价",
    dashboard: "今日行情看板",
    volatility: "波动率",
    todayHigh: "今日最高",
    todayLow: "今日最低",
    support: "支撑位",
    resistance: "阻力位",
    premiumTable: "实物金溢价表",
    rawMaterial: "AU9999 原料",
    bankBar: "银行金条",
    brandJewelry: "品牌首饰",
    autoRefresh: "每小时自动刷新",
    countdown: "下次更新",
    error: "数据加载失败",
    fxRate: "实时汇率",
    dataSource: "数据来源：上海黄金交易所参考",
  },
} as const;

interface GoldData {
  priceUsd: number;
  priceCny: number;
  exchangeRate: number;
  changePercent: number;
  prevClosePrice: number;
  highPriceCny: number;
  lowPriceCny: number;
  bankBarPriceCny: number;
  jewelryPriceCny: number;
  recyclePriceCny: number;
  history: { date: string; priceCny: number }[];
}

function AnimatedPrice({ price, decimals = 2 }: { price: number; decimals?: number }) {
  const text = price.toFixed(decimals);
  const digits = text.split("");
  return (
    <span className="inline-flex">
      {digits.map((ch, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden"
          style={{ width: ch === "," || ch === "." ? "0.4em" : "0.6em" }}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={`${i}-${ch}`}
              initial={{ y: ch === "-" ? 0 : 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.02 }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

function AnimatedInteger({ value }: { value: number }) {
  const text = Math.round(value).toLocaleString();
  const digits = text.split("");
  return (
    <span className="inline-flex">
      {digits.map((ch, i) => (
        <span
          key={i}
          className="relative inline-block overflow-hidden"
          style={{ width: ch === "," ? "0.35em" : "0.6em" }}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={`${i}-${ch}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.015 }}
              className="inline-block"
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

function calcSupportResistance(history: { priceCny: number }[]) {
  const prices = history.map((h) => h.priceCny);
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = 3; i < prices.length - 3; i++) {
    const prev = prices.slice(i - 3, i);
    const next = prices.slice(i + 1, i + 4);
    if (prev.every((p) => p < prices[i]) && next.every((p) => p < prices[i])) {
      highs.push(prices[i]);
    }
    if (prev.every((p) => p > prices[i]) && next.every((p) => p > prices[i])) {
      lows.push(prices[i]);
    }
  }

  const support = lows.length > 0
    ? Math.round((lows.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, lows.length)) * 100) / 100
    : Math.round((Math.min(...prices) * 1.005) * 100) / 100;

  const resistance = highs.length > 0
    ? Math.round((highs.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, highs.length)) * 100) / 100
    : Math.round((Math.max(...prices) * 0.995) * 100) / 100;

  return { support, resistance };
}

export default function Home() {
  const [data, setData] = useState<GoldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("zh");
  const [chartRange, setChartRange] = useState<ChartRange>("2m");
  const [calcMode, setCalcMode] = useState<CalcMode>("grams");
  const [calcInput, setCalcInput] = useState<string>("");
  const [countdown, setCountdown] = useState(3600);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const fetchData = () => {
    fetch("/api/gold")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
          setError(null);
          setCountdown(3600);
        }
      })
      .catch(() => setError("Network error"));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { trigger, rippleElement } = useRipple();

  const tr = t[lang];

  const chartData = useMemo(() => {
    if (!data) return [];
    return chartRange === "2m" ? data.history.slice(-61) : data.history;
  }, [data, chartRange]);

  const chartWidth = chartData.length * (chartRange === "2m" ? 12 : 8);

  const cnyMin = useMemo(() => {
    if (chartData.length === 0) return 900;
    return Math.floor(chartData.reduce((min, p) => Math.min(min, p.priceCny), Infinity) / 10) * 10;
  }, [chartData]);

  const cnyMax = useMemo(() => {
    if (chartData.length === 0) return 1100;
    return Math.ceil(chartData.reduce((max, p) => Math.max(max, p.priceCny), 0) / 10) * 10;
  }, [chartData]);

  const { yTicks, yDomain } = useMemo(() => {
    const range = cnyMax - cnyMin;
    const roughStep = range / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const niceStep = ([1, 2, 5, 10].find((n) => n * magnitude >= roughStep) ?? 10) * magnitude;
    const niceMin = Math.floor(cnyMin / niceStep) * niceStep;
    const niceMax = Math.ceil(cnyMax / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let v = niceMin; v <= niceMax + niceStep / 2; v += niceStep) {
      ticks.push(v);
    }
    return { yTicks: ticks, yDomain: [niceMin, niceMax] as [number, number] };
  }, [cnyMin, cnyMax]);

  const sr = useMemo(() => {
    if (!data) return { support: 0, resistance: 0 };
    return calcSupportResistance(data.history);
  }, [data]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-400">{tr.error}: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-amber-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  const isUp = data.changePercent >= 0;
  const jewelryPrice = data.jewelryPriceCny;
  const bankBarPrice = data.bankBarPriceCny;
  const recyclePrice = data.recyclePriceCny;

  // Calculator
  const calcResult =
    calcMode === "grams"
      ? calcInput
        ? parseFloat(calcInput) * data.priceCny
        : null
      : calcInput
        ? parseFloat(calcInput) / data.priceCny
        : null;

  const resultLabel = calcMode === "grams" ? tr.total : tr.grams;
  const resultUnit = calcMode === "grams" ? "¥" : " g";

  const countdownMin = Math.floor(countdown / 60);
  const countdownSec = countdown % 60;

  return (
    <div className="min-h-screen px-4 py-8 pb-16 font-sans relative">
      <GoldParticles />
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          className="rounded-full border border-amber-700/40 px-3 py-1 text-xs font-medium text-amber-500 hover:border-amber-500 transition-colors backdrop-blur-md bg-black/40"
        >
          {lang === "en" ? "中文" : "EN"}
        </button>
      </div>

      {/* Title */}
      <header className="mb-6 text-center">
        <h1 className="text-lg font-bold tracking-wider text-amber-500 sm:text-xl">
          {tr.title}
        </h1>
      </header>

      {/* Main Price Card */}
      <div className="relative mx-auto max-w-md">
        <motion.div
          className="rounded-2xl border border-amber-500/30 bg-zinc-950/70 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(234,179,8,0.05)] cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileTap={{ scale: 0.97 }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            trigger(e.clientX - rect.left, e.clientY - rect.top);
          }}
        >
          <div className="text-center">
            <div className="text-7xl font-bold text-yellow-400 tracking-tight">
              ¥<AnimatedPrice price={data.priceCny} />
            </div>
            <p className="mt-1 text-sm text-amber-500/60">/g</p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-amber-500/60">{tr.changeLabel}</span>
              <span className={`text-lg font-semibold ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? "+" : ""}{data.changePercent}% {isUp ? "▲" : "▼"}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-700/20">
              <p className="text-sm text-amber-400/60">
                {tr.intlTitle}: <span className="text-amber-400">${(data.priceUsd ?? 0).toLocaleString()} {tr.intlUnit}</span>
              </p>
            </div>
          </div>
        </motion.div>
        {rippleElement}
      </div>

      {/* Market Matrix */}
      <div className="mx-auto mt-4 max-w-md grid grid-cols-3 gap-3">
        {[
          { label: tr.jewelry, price: jewelryPrice, color: "text-amber-300" },
          { label: tr.bank, price: data.bankBarPriceCny, color: "text-amber-400" },
          { label: tr.recycle, price: recyclePrice, color: "text-amber-500" },
        ].map((item, i) => (
          <div key={item.label} className="relative overflow-hidden rounded-xl">
            <motion.div
              className="border border-amber-700/30 bg-zinc-950/60 backdrop-blur-md p-3 text-center cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              whileTap={{ scale: 0.93 }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                trigger(e.clientX - rect.left, e.clientY - rect.top);
              }}
            >
              <p className="text-[10px] uppercase tracking-wider text-amber-600 mb-1">{item.label}</p>
              <p className={`text-sm font-bold ${item.color}`}>¥{(item.price ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-amber-700">/g</p>
            </motion.div>
            {rippleElement}
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <motion.div
        className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-500/30 bg-zinc-950/70 backdrop-blur-md p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-500">
            {chartRange === "2m" ? tr.chartTitle2m : tr.chartTitle1y}
          </h2>
          <div className="flex rounded-lg border border-amber-700/40 overflow-hidden">
            <button
              onClick={() => { setChartRange("2m"); setActiveIndex(null); }}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                chartRange === "2m" ? "bg-amber-700/40 text-amber-300" : "text-amber-600"
              }`}
            >
              2M
            </button>
            <button
              onClick={() => { setChartRange("1y"); setActiveIndex(null); }}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                chartRange === "1y" ? "bg-amber-700/40 text-amber-300" : "text-amber-600"
              }`}
            >
              1Y
            </button>
          </div>
        </div>
        <p className="mb-2 text-xs text-amber-700">{tr.swipeHint}</p>
        <div className="flex">
          {/* Fixed Y-axis */}
          <div
            className="flex-shrink-0 relative border-r border-amber-700/50"
            style={{ width: 55, height: 220, paddingTop: 5, paddingBottom: 20 }}
          >
            {yTicks.map((tick) => {
              const percent = (tick - yDomain[0]) / (yDomain[1] - yDomain[0]);
              return (
                <div
                  key={tick}
                  className="absolute right-1.5 text-[10px] text-amber-400 leading-none"
                  style={{ bottom: `calc(${percent * 100}% - 0.5em)` }}
                >
                  ¥{tick}
                </div>
              );
            })}
          </div>

          {/* Scrollable chart */}
          <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ touchAction: "pan-x" }}>
            <div style={{ width: chartWidth + 42, minWidth: "100%", paddingLeft: 12, paddingRight: 30 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={chartData}
                  margin={{ left: 8, right: 20, bottom: 20 }}
                  onMouseMove={(e) => {
                    if (e && e.activeTooltipIndex !== undefined) {
                      setActiveIndex(Number(e.activeTooltipIndex));
                    }
                  }}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFD700" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#78350f" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#b45309", fontSize: 10 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    interval={chartRange === "2m" ? 2 : chartData.length < 120 ? 3 : 7}
                    axisLine={{ stroke: "#b45309" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={yDomain}
                    ticks={yTicks}
                    tick={false}
                    axisLine={false}
                    width={0}
                  />
                  <Tooltip
                    cursor={{ stroke: "#eab308", strokeDasharray: "4 4", strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: "rgba(9,9,11,0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid #b45309",
                      borderRadius: "8px",
                      color: "#facc15",
                      fontSize: 12,
                    }}
                    formatter={(value: unknown) => [`¥${value}`, "AU9999"]}
                    labelFormatter={(label: unknown) => {
                      const d = new Date(label as string);
                      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  {activeIndex !== null && (
                    <ReferenceLine
                      x={chartData[activeIndex]?.date}
                      stroke="#eab308"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="priceCny"
                    stroke="#FFD700"
                    strokeWidth={2}
                    fill="url(#goldGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#FFD700", stroke: "#b45309" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Calculator */}
      <motion.div
        className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-500/30 bg-zinc-950/70 backdrop-blur-md p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-500">
          {tr.calculator}
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder={calcMode === "grams" ? tr.grams : tr.yuan}
            value={calcInput}
            onChange={(e) => setCalcInput(e.target.value)}
            className="flex-1 rounded-lg border border-amber-700/40 bg-black/60 px-4 py-2 text-sm text-amber-300 placeholder-amber-700 outline-none focus:border-amber-500 transition-colors"
          />
          <button
            onClick={() => { setCalcMode(calcMode === "grams" ? "price" : "grams"); setCalcInput(""); }}
            className="rounded-lg border border-amber-700/40 px-3 py-2 text-xs font-medium text-amber-500 hover:border-amber-500 hover:text-amber-300 transition-colors"
          >
            {calcMode === "grams" ? tr.grams : tr.yuan}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-amber-500/80">{resultLabel}</span>
          <span className="text-xl font-bold text-yellow-400">
            {calcResult !== null ? (
              calcMode === "grams" ? (
                <span>¥<AnimatedInteger value={calcResult} /></span>
              ) : (
                <span><AnimatedPrice price={calcResult} decimals={3} /> g</span>
              )
            ) : "—"}
          </span>
        </div>
      </motion.div>

      {/* Dashboard */}
      <motion.div
        className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-500/30 bg-zinc-950/70 backdrop-blur-md p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-amber-500">
          {tr.dashboard}
        </h2>

        {/* Volatility */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 mb-2">{tr.volatility}</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-green-700/30 bg-green-950/20 p-2 text-center">
              <p className="text-[10px] text-green-600">{tr.todayHigh}</p>
              <p className="text-sm font-bold text-green-400">¥{(data.highPriceCny ?? 0).toLocaleString()}</p>
            </div>
            <div className="flex-1 rounded-lg border border-red-700/30 bg-red-950/20 p-2 text-center">
              <p className="text-[10px] text-red-600">{tr.todayLow}</p>
              <p className="text-sm font-bold text-red-400">¥{(data.lowPriceCny ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Support / Resistance */}
        <div className="mb-4">
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-amber-700/30 bg-amber-950/10 p-2 text-center">
              <p className="text-[10px] text-amber-600">{tr.support}</p>
              <p className="text-sm font-bold text-amber-400">¥{(sr.support || 0).toLocaleString()}</p>
            </div>
            <div className="flex-1 rounded-lg border border-amber-700/30 bg-amber-950/10 p-2 text-center">
              <p className="text-[10px] text-amber-600">{tr.resistance}</p>
              <p className="text-sm font-bold text-amber-400">¥{(sr.resistance || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Premium Table */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-amber-600 mb-2">{tr.premiumTable}</p>
          <div className="rounded-lg border border-amber-700/30 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-amber-700/30">
                  <th className="py-2 px-3 text-left text-amber-600 font-medium">{lang === "zh" ? "类型" : "Type"}</th>
                  <th className="py-2 px-3 text-right text-amber-600 font-medium">{lang === "zh" ? "估价 (¥/g)" : "Est. (¥/g)"}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-amber-700/20">
                  <td className="py-2 px-3 text-amber-400/80">{tr.rawMaterial}</td>
                  <td className="py-2 px-3 text-right text-amber-400 font-medium">¥{(data.priceCny ?? 0).toLocaleString()}</td>
                </tr>
                <tr className="border-b border-amber-700/20">
                  <td className="py-2 px-3 text-amber-400/80">{tr.bankBar}</td>
                  <td className="py-2 px-3 text-right text-amber-400 font-medium">¥{(bankBarPrice ?? 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400/80">{tr.brandJewelry}</td>
                  <td className="py-2 px-3 text-right text-amber-300 font-medium">¥{(jewelryPrice ?? 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="mx-auto mt-6 max-w-md flex flex-col items-center gap-2">
        <div className="flex justify-between w-full text-xs text-amber-700/80">
          <span>{tr.fxRate}: 1 USD = {data.exchangeRate} CNY</span>
          <span>{tr.dataSource}</span>
        </div>
        <div className="flex justify-between w-full text-xs">
          <span className="text-amber-600">{tr.autoRefresh}</span>
          <span className="text-amber-500 font-mono">
            {tr.countdown}: {String(countdownMin).padStart(2, "0")}:{String(countdownSec).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* AI Assistant */}
      <AIAssistant
        currentPrice={data.priceCny}
        globalPrice={data.priceUsd}
        exchangeRate={data.exchangeRate}
        lang={lang}
      />
    </div>
  );
}
