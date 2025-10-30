"use client";
import React, { useEffect, useState } from "react";

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

type Payload = { todayPicks: Pick[]; yesterdayPicks: Pick[] };

const badge = (c: number) => {
  const base = "px-2 py-0.5 rounded-full text-xs font-semibold";
  if (c >= 80) return <span className={`${base} bg-purple-100 text-purple-800`}>{c}</span>;
  if (c >= 60) return <span className={`${base} bg-blue-100 text-blue-800`}>{c}</span>;
  return <span className={`${base} bg-amber-100 text-amber-800`}>{c}</span>;
};

const Row: React.FC<{ p: Pick; yesterday?: boolean }> = ({ p, yesterday }) => {
  const rowBase = "hover:bg-gray-50 transition";
  let rowClass = rowBase;
  if (yesterday) {
    if (p.hitBy1030ET === true) rowClass += " bg-green-50";
    else if (p.hitBy1030ET === false) rowClass += " bg-red-50";
  }
  return (
    <tr className={rowClass}>
      <td className="px-3 py-2 font-bold">{p.ticker}</td>
      <td className="px-3 py-2">{new Date(p.pickTime).toLocaleString()}</td>
      <td className="px-3 py-2">${p.pickPrice.toFixed(2)}</td>
      <td className="px-3 py-2">${p.targetPrice.toFixed(2)}</td>
      <td className="px-3 py-2">{badge(p.confidence)}</td>
    </tr>
  );
};

const Table: React.FC<{ title: string; data: Pick[]; yesterday?: boolean }> = ({ title, data, yesterday }) => (
  <div className="bg-white shadow rounded-2xl p-4">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="text-xs text-gray-500">Rows: {data.length}</span>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Ticker</th>
            <th className="px-3 py-2 text-left">Pick Time</th>
            <th className="px-3 py-2 text-left">Pick Price</th>
            <th className="px-3 py-2 text-left">Target</th>
            <th className="px-3 py-2 text-left">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((p) => <Row key={`${title}-${p.ticker}-${p.pickTime}`} p={p} yesterday={yesterday} />)}
        </tbody>
      </table>
    </div>
    {yesterday && <p className="text-xs text-gray-500 mt-2">Green = hit target by 10:30 a.m. ET; Red = did not.</p>}
  </div>
);

export default function Home() {
  const [payload, setPayload] = useState<Payload>({ todayPicks: [], yesterdayPicks: [] });
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/picks", { cache: "no-store" });
      const json: Payload = await res.json();
      const topToday = [...json.todayPicks].sort((a, b) => b.confidence - a.confidence).slice(0, 10);
      setPayload({ todayPicks: topToday, yesterdayPicks: json.yesterdayPicks || [] });
      setLastUpdate(new Date().toLocaleTimeString());
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overnight Catalyst-Support Picks</h1>
        <span className="text-xs text-gray-500">Last update: {lastUpdate}</span>
      </header>
      <Table title="Today’s Picks (Top-10 by Confidence)" data={payload.todayPicks} />
      <Table title="Yesterday’s Picks (Outcome by 10:30 a.m. ET)" data={payload.yesterdayPicks} yesterday />
    </div>
  );
}
