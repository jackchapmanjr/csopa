import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

type Pick = {
  ticker: string;
  pickTime: string;
  pickPrice: number;
  targetPrice: number;
  confidence: number;
  supportLevel?: number;
  catalystType?: string;
  catalystTimestamp?: string;
  evidenceLinks?: string[];
  notes?: string;
  hitBy1030ET?: boolean;
};

export async function GET() {
  const client = await pool.connect();
  try {
    const todayRes = await client.query(`
      select ticker,
             to_char(pick_time at time zone 'America/New_York', 'YYYY-MM-DD"T"HH24:MI:SSOF') as pick_time_et,
             pick_price, target_price, confidence, support_level,
             catalyst_type,
             to_char(catalyst_timestamp at time zone 'America/New_York', 'YYYY-MM-DD"T"HH24:MI:SSOF') as catalyst_time_et,
             evidence_links, notes
      from picks_today
      order by confidence desc, pick_time desc
      limit 10
    `);

    const yesterdayRes = await client.query(`
      select ticker,
             to_char(pick_time at time zone 'America/New_York', 'YYYY-MM-DD"T"HH24:MI:SSOF') as pick_time_et,
             pick_price, target_price, confidence, coalesce(hit_by_1030_et,false) as hit
      from picks_yesterday
      where created_at::date = (current_date - interval '1 day')
      order by confidence desc
      limit 50
    `);

    const todayPicks: Pick[] = todayRes.rows.map((r: any) => ({
      ticker: r.ticker,
      pickTime: r.pick_time_et,
      pickPrice: Number(r.pick_price),
      targetPrice: Number(r.target_price),
      confidence: Number(r.confidence),
      supportLevel: r.support_level !== null ? Number(r.support_level) : undefined,
      catalystType: r.catalyst_type ?? undefined,
      catalystTimestamp: r.catalyst_time_et ?? undefined,
      evidenceLinks: r.evidence_links ?? undefined,
      notes: r.notes ?? undefined
    }));

    const yesterdayPicks: Pick[] = yesterdayRes.rows.map((r: any) => ({
      ticker: r.ticker,
      pickTime: r.pick_time_et,
      pickPrice: Number(r.pick_price),
      targetPrice: Number(r.target_price),
      confidence: Number(r.confidence),
      hitBy1030ET: r.hit
    }));

    return NextResponse.json({ todayPicks: todayPicks.slice(0, 10), yesterdayPicks });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ todayPicks: [], yesterdayPicks: [] });
  } finally {
    client.release();
  }
}

