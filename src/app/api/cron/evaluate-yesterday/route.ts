import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  ssl: { rejectUnauthorized: false }
});

// placeholder: randomly decides hit; later replace with real 09:30–10:30 ET high check
function mockHit(): boolean {
  return Math.random() > 0.5;
}

export async function GET() {
  const client = await pool.connect();
  try {
    // select picks from "yesterday" by pick_time date
    const yRes = await client.query(`
      select ticker, pick_time, pick_price, target_price, confidence
      from picks_today
      where pick_time::date = (current_date - interval '1 day')
      order by confidence desc
      limit 50
    `);

    await client.query("begin");
    for (const r of yRes.rows) {
      const hit = mockHit();
      await client.query(`
        insert into picks_yesterday (ticker, pick_time, pick_price, target_price, confidence, hit_by_1030_et)
        values ($1,$2,$3,$4,$5,$6)
      `, [r.ticker, r.pick_time, r.pick_price, r.target_price, r.confidence, hit]);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    console.error(e);
    return NextResponse.json({ ok: false });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, inserted: (yRes?.rowCount ?? 0) });
}
