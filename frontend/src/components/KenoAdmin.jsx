import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./KenoAdmin.css";

// Admin report for Fast Keno: profit per day and per bet type, recent draws,
// open (unsettled) tickets and the current settings.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const TYPE_LABEL = {
  numbers: "Numbers",
  heads: "Heads",
  tails: "Tails",
  ht_evens: "H/T Evens",
  odd: "Odd",
  even: "Even",
  oe_evens: "O/E Evens",
};
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }));
const pct = (n) => (n == null ? "—" : `${n.toFixed(1)}%`);

export default function KenoAdmin() {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("admintoken");
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/admin/report?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Your admin session has expired. Please log in again.");
      } else {
        setError("Could not load the report.");
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const t = data?.totals;

  return (
    <div className="ka">
      <div className="ka-head">
        <div>
          <h1>Fast Keno report</h1>
          <p className="ka-muted">Updates every minute. Days follow Addis Ababa time.</p>
        </div>
        <div className="ka-head-actions">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          <button onClick={() => navigate("/AdminDashboard")}>Back</button>
        </div>
      </div>

      {error && <div className="ka-error">{error}</div>}

      {t && (
        <>
          <section className="ka-kpis">
            <div className="ka-kpi"><span>Staked</span><strong>{fmt(t.staked)}</strong></div>
            <div className="ka-kpi"><span>Paid to players</span><strong>{fmt(t.paid)}</strong></div>
            <div className={`ka-kpi ${t.profit < 0 ? "neg" : "pos"}`}><span>House profit</span><strong>{fmt(t.profit)}</strong></div>
            <div className="ka-kpi"><span>Payback</span><strong>{pct(t.payback)}</strong><em>target ≈ 80%</em></div>
            <div className="ka-kpi"><span>Tickets</span><strong>{fmt(t.tickets)}</strong><em>{fmt(t.winners)} winners</em></div>
            <div className="ka-kpi"><span>Open tickets</span><strong>{fmt(data.pendingTickets)}</strong><em>{fmt(data.pendingStake)} birr staked</em></div>
          </section>

          <section className="ka-card">
            <h2>By day</h2>
            <div className="ka-table-wrap">
              <table>
                <thead>
                  <tr><th>Day</th><th>Draws</th><th>Tickets</th><th>Staked</th><th>Paid</th><th>Profit</th><th>Payback</th></tr>
                </thead>
                <tbody>
                  {data.byDay.length === 0 && <tr><td colSpan={7} className="ka-muted">No tickets in this period.</td></tr>}
                  {data.byDay.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td><td>{fmt(d.draws)}</td><td>{fmt(d.tickets)}</td>
                      <td>{fmt(d.staked)}</td><td>{fmt(d.paid)}</td>
                      <td className={d.profit < 0 ? "neg" : "pos"}>{fmt(d.profit)}</td>
                      <td>{pct(d.payback)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ka-card">
            <h2>By bet type</h2>
            <div className="ka-table-wrap">
              <table>
                <thead>
                  <tr><th>Bet type</th><th>Tickets</th><th>Staked</th><th>Paid</th><th>Profit</th><th>Payback</th></tr>
                </thead>
                <tbody>
                  {data.byType.map((b) => (
                    <tr key={b.type}>
                      <td>{TYPE_LABEL[b.type] || b.type}</td><td>{fmt(b.tickets)}</td>
                      <td>{fmt(b.staked)}</td><td>{fmt(b.paid)}</td>
                      <td className={b.profit < 0 ? "neg" : "pos"}>{fmt(b.profit)}</td>
                      <td>{pct(b.payback)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ka-muted">
              Payback over a few hundred tickets swings a lot because of rare big wins; it settles near 80% as volume grows.
            </p>
          </section>

          <section className="ka-card">
            <h2>Recent draws with tickets</h2>
            <div className="ka-table-wrap">
              <table>
                <thead>
                  <tr><th>Draw</th><th>Time</th><th>Tickets</th><th>Staked</th><th>Paid</th><th>Profit</th></tr>
                </thead>
                <tbody>
                  {data.recentDraws.map((d) => (
                    <tr key={d.drawId}>
                      <td>#{d.drawId}</td>
                      <td>{new Date(d.drawAt).toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa" })}</td>
                      <td>{fmt(d.tickets)}</td><td>{fmt(d.staked)}</td><td>{fmt(d.paid)}</td>
                      <td className={d.profit < 0 ? "neg" : "pos"}>{fmt(d.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ka-card">
            <h2>Current settings</h2>
            <div className="ka-settings">
              <div>Game starts only when someone places a ticket</div>
              <div>Join countdown <strong>{data.config.JOIN_WINDOW_MS / 1000}s</strong></div>
              <div>Numbers called every <strong>{data.config.CALL_INTERVAL_MS / 1000}s</strong></div>
              <div>Check time after draw <strong>{data.config.CHECK_WINDOW_MS / 1000}s</strong></div>
              <div>Stake <strong>{data.config.MIN_STAKE}–{data.config.MAX_STAKE}</strong> birr</div>
              <div>Max win per ticket <strong>{fmt(data.config.MAX_WIN_PER_TICKET)}</strong></div>
              <div>Max tickets per game <strong>{data.config.MAX_TICKETS_PER_DRAW}</strong></div>
              <div>Multi-draw <strong>{data.config.MULTI_DRAW_OPTIONS.join(", ")}</strong></div>
              {Object.entries(data.sideBets).map(([k, v]) => (
                <div key={k}>{v.label} <strong>×{v.multiplier}</strong></div>
              ))}
            </div>
            <p className="ka-muted">To change settings, edit the top of <code>backend/src/keno.js</code> and restart the server.</p>
          </section>
        </>
      )}
    </div>
  );
}
