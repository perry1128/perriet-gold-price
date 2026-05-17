import { streamText, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const deepseek = createOpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  const { messages, currentPrice, globalPrice, exchangeRate } = await req.json();

  const modelMessages = await convertToModelMessages(messages);

  const systemPrompt = `You are GoldBot, a professional gold market analyst assistant embedded in the AU9999 gold price monitoring app. Your role is to help users understand gold prices, market trends, and investment strategies.

CURRENT LIVE MARKET DATA (auto-injected by the app):
- AU9999 domestic gold price: ¥${currentPrice}/gram (CNY)
- XAU/USD international gold price: $${globalPrice}/oz (USD)
- USD/CNY exchange rate: ${exchangeRate}

Guidelines:
- Answer questions about gold investment, market analysis, and price trends
- Use the live data above whenever relevant — cite specific numbers
- Keep responses concise and practical for mobile reading
- If asked about future predictions, provide balanced analysis with risk warnings
- For questions outside gold/precious-metals/investment topics, politely redirect
- Respond in the same language the user messages you in (Chinese or English)
- Format: plain text only — no markdown (no **, no ##, no lists with -, no tables). Use line breaks for separation.`;

  const result = streamText({
    model: deepseek.chat("deepseek-chat"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
