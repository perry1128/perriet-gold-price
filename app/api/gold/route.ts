const BASE = "https://tsgold2.market.alicloudapi.com";
const SGE_HISTORY_URL = "https://www.sge.com.cn/graph/Dailyhq";
const OZ_TO_GRAM = 31.1035;

function authHeaders(): Record<string, string> {
  return { Authorization: `APPCODE ${process.env.SHGOLD_APPCODE || ""}` };
}

async function fetchSgeHistory(): Promise<{ date: string; priceCny: number }[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(SGE_HISTORY_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.sge.com.cn/",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "instid=Au99.99",
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("SGE history failed");
    const json = await res.json() as { time: [string, number, number, number, number][] };
    const currentYear = new Date().getFullYear().toString();
    return json.time
      .filter((row) => row[0].startsWith(currentYear))
      .map((row) => ({
        date: row[0],
        priceCny: Math.round(row[2] * 100) / 100,
      }));
  } catch {
    return [];
  }
}

export async function GET() {
  const appCode = process.env.SHGOLD_APPCODE;
  if (!appCode) {
    return Response.json(
      { error: "SHGOLD_APPCODE not configured" },
      { status: 500 }
    );
  }

  try {
    const headers = authHeaders();
    const [resSh, resIntl, resStore, resBank, sgeHistory] = await Promise.all([
      fetch(`${BASE}/shgold`, { headers }),
      fetch(`${BASE}/gjgold`, { headers }),
      fetch(`${BASE}/storegold`, { headers }),
      fetch(`${BASE}/bankgold`, { headers }),
      fetchSgeHistory(),
    ]);

    if (!resSh.ok) throw new Error(`shgold failed: ${resSh.status}`);
    if (!resIntl.ok) throw new Error(`gjgold failed: ${resIntl.status}`);
    if (!resStore.ok) throw new Error(`storegold failed: ${resStore.status}`);

    const [sh, intl, store] = await Promise.all([
      resSh.json(),
      resIntl.json(),
      resStore.json(),
    ]);

    // Shanghai Gold Exchange — live
    const au9999 = sh.data.list.Au9999;
    const priceCny = parseFloat(au9999.price);
    const highPriceCny = parseFloat(au9999.maxprice);
    const lowPriceCny = parseFloat(au9999.minprice);
    const prevClosePrice = parseFloat(au9999.lastclosingprice);
    const changePercent = parseFloat(au9999.changepercent);

    // International XAU/USD
    const xau = intl.data.list.XAU;
    const priceUsd = parseFloat(xau.price);

    // Implied exchange rate
    const exchangeRate = Math.round((priceCny * OZ_TO_GRAM / priceUsd) * 100) / 100;

    // Store gold — mainland only (元/克), filter HK (港币/两)
    const stores: { typename: string; gold: string; goldbar: string; unit: string }[] = store.data.list;
    const mainland = stores.filter((s) => s.unit === "元/克" || s.unit === "元\\/克");
    const storePrices = mainland.map((s) => parseFloat(s.gold)).filter((n) => !isNaN(n));
    const barPrices = mainland.map((s) => parseFloat(s.goldbar)).filter((n) => !isNaN(n));
    const jewelryPriceCny = storePrices.length > 0
      ? Math.round(storePrices.reduce((a, b) => a + b, 0) / storePrices.length)
      : Math.round((priceCny + parseInt(process.env.JEWELRY_PREMIUM || "410", 10)) * 100) / 100;

    // Bank paper gold (银行积存金) — CNYAAU from bankgold API
    let bankBarPriceCny: number;
    if (resBank.ok) {
      const bank = await resBank.json();
      const cnyAau = bank.data.list.CNYAAU;
      bankBarPriceCny = parseFloat(cnyAau.price);
      if (isNaN(bankBarPriceCny)) {
        bankBarPriceCny = barPrices.length > 0
          ? Math.round(barPrices.reduce((a, b) => a + b, 0) / barPrices.length)
          : Math.round((priceCny + parseInt(process.env.BANKBAR_PREMIUM || "12", 10)) * 100) / 100;
      }
    } else {
      bankBarPriceCny = barPrices.length > 0
        ? Math.round(barPrices.reduce((a, b) => a + b, 0) / barPrices.length)
        : Math.round((priceCny + parseInt(process.env.BANKBAR_PREMIUM || "12", 10)) * 100) / 100;
    }

    // Recycle price — market reference (spot price minus handling fee)
    const recycleDiscount = parseInt(process.env.RECYCLE_DISCOUNT || "15", 10);
    const recyclePriceCny = Math.round((priceCny - recycleDiscount) * 100) / 100;

    const history = sgeHistory.length > 0 ? sgeHistory : [];

    return Response.json({
      priceUsd: Math.round(priceUsd * 100) / 100,
      priceCny,
      exchangeRate,
      changePercent: Math.round(changePercent * 100) / 100,
      prevClosePrice: Math.round(prevClosePrice * 100) / 100,
      highPriceCny,
      lowPriceCny,
      bankBarPriceCny,
      jewelryPriceCny,
      recyclePriceCny,
      history,
    });
  } catch (err) {
    console.error("Failed to fetch gold data:", err);
    return Response.json(
      { error: "Failed to fetch gold data" },
      { status: 500 }
    );
  }
}
