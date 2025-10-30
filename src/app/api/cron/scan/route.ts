import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: { rejectUnauthorized: false }
});

function mockPick(ticker: string) {
  const now = new Date();
  const price = +(20 + Math.random() * 150).toFixed(2);
  const conf = Math.floor(60 + Math.random() * 35); // 60–95
  const target = +(price * (1.02 + Math.random() * 0.03)).toFixed(2); // +2–5%
  const support = +(price * 0.985).toFixed(2);
  return {
    ticker,
    pick_time: now.toISOString(),
    pick_price: price,
    target_price: target,
    confidence: conf,
    support_level: support,
    catalyst_type: "Example positive catalyst",
    catalyst_timestamp: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
    evidence_links: ["https://example.com/news"],
    notes: "Mock: held anchored VWAP; volume node support."
  };
}

export async function GET() {
  const tickers = ["TSLA","NVDA","AAPL","AMD","MSFT","AMZN","META","NFLX","SMCI","SHOP","MU","ORCL","AVGO"];
  const picks = tickers
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(5 + Math.random() * 5)) // 5–10
    .map(mockPick)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from picks_today");
    for (const p of picks) {
      await client.query(`
        insert into picks_today
          (ticker, pick_time, pick_price, target_price, confidence, support_level,
           catalyst_type, catalyst_timestamp, evidence_links, notes)
        values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        p.ticker, p.pick_time, p.pick_price, p.target_price, p.confidence,
        p.support_level, p.catalyst_type, p.catalyst_timestamp, p.evidence_links, p.notes
      ]);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    console.error(e);
    return NextResponse.json({ ok: false });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, count: picks.length });
}
