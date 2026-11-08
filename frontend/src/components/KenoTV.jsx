import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import socket from "../socket";
import "./KenoTV.css";

// Full-screen display for a TV or big screen: countdown, live draw on the
// 1–80 board, last result, previous games and hot/cold numbers.
// Open /KenoTV in a browser and press F11 for full screen.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LABEL = { heads: "HEADS", tails: "TAILS", ht_evens: "EVENS", odd: "ODD", even: "EVEN", oe_evens: "EVENS" };
function summarize(numbers) {
  const h = numbers.filter((n) => n <= 40).length;
  const o = numbers.filter((n) => n % 2 === 1).length;
  return {
    headsCount: h,
    oddCount: o,
    headsTails: h > 10 ? "heads" : h < 10 ? "tails" : "ht_evens",
    oddEven: o > 10 ? "odd" : o < 10 ? "even" : "oe_evens",
  };
}

export default function KenoTV() {
  const [clockOffset, setClockOffset] = useState(0);
  const [round, setRound] = useState({ phase: "waiting", drawId: null, drawAt: null, draw: null });
  const [joinMs, setJoinMs] = useState(15000);
  const [now, setNow] = useState(Date.now());
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  const applyRound = useCallback((r) => {
    if (!r) return;
    setClockOffset(r.serverNow - Date.now());
    setRound(r);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/stats`);
      setStats(data);
    } catch {
      /* keep old stats */
    }
  }, []);

  const loadState = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/state`);
      setJoinMs(data.config.JOIN_WINDOW_MS);
      setHistory(data.recentDraws || []);
      applyRound(data.round);
    } catch {
      /* retry later */
    }
  }, [applyRound]);

  useEffect(() => {
    loadState();
    loadStats();
    socket.on("keno:round", applyRound);
    socket.on("connect", loadState);
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => {
      socket.off("keno:round", applyRound);
      socket.off("connect", loadState);
      clearInterval(t);
    };
  }, [loadState, loadStats, applyRound]);

  // After each game: refresh history and hot/cold numbers.
  useEffect(() => {
    if (round.phase === "waiting" || round.phase === "betting") {
      loadState();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.phase]);

  const serverNow = now + clockOffset;
  const drawing = round.phase === "drawing" || round.phase === "checking";
  const called = useMemo(() => {
    const d = round.draw;
    if (!d) return history[0]?.numbers || [];
    if (round.phase === "checking") return d.numbers;
    const n = Math.min(d.numbers.length, Math.max(0, Math.floor((serverNow - d.startedAt) / d.stepMs) + 1));
    return d.numbers.slice(0, n);
  }, [round, serverNow, history]);
  const drawnSet = useMemo(() => new Set(called), [called]);
  const latest = round.phase === "drawing" ? called[called.length - 1] : null;
  const seconds = round.drawAt ? Math.max(0, Math.ceil((round.drawAt - serverNow) / 1000)) : 0;
  const ringPct = round.phase === "betting" ? Math.min(100, (seconds * 1000 / joinMs) * 100) : round.phase === "drawing" ? (called.length / 20) * 100 : 0;
  const summary = round.phase === "checking" ? summarize(round.draw.numbers) : null;
  const shownId = drawing ? round.draw?.drawId : history[0]?.drawId;

  return (
    <div className="tv">
      <div className="tv-main">
        <div className="tv-board">
          {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => (
            <div key={n} className={`tv-cell ${n > 40 ? "tail" : ""} ${drawnSet.has(n) ? "on" : ""} ${n === latest ? "latest" : ""}`}>
              {n}
            </div>
          ))}
        </div>
        <div className="tv-board-foot">
          <span>HEADS 1–40</span>
          <span>GAME #{shownId ?? "—"} · {called.length}/20</span>
          <span>TAILS 41–80</span>
        </div>
      </div>

      <aside className="tv-side">
        <div className="tv-brand">🎱 FAST KENO</div>

        <div className="tv-countdown" style={{ "--pct": `${ringPct}%` }}>
          <div className="tv-countdown-inner">
            <div className="tv-seconds">
              {round.phase === "betting" ? seconds : round.phase === "drawing" ? called.length : round.phase === "checking" ? "✓" : "…"}
            </div>
            <div className="tv-countdown-label">
              {round.phase === "waiting" && <>WAITING FOR<br />PLAYERS</>}
              {round.phase === "betting" && <>GAME #{round.drawId}<br />STARTS SOON</>}
              {round.phase === "drawing" && <>CALLING<br />OF 20</>}
              {round.phase === "checking" && <>GAME #{round.draw?.drawId}<br />FINISHED</>}
            </div>
          </div>
        </div>

        {latest && <div key={latest} className="tv-latest">{latest}</div>}

        {summary && (
          <div className="tv-result">
            <div className={`tv-result-chip ${summary.headsTails}`}>
              {LABEL[summary.headsTails]}
              <small>{summary.headsCount}–{20 - summary.headsCount}</small>
            </div>
            <div className={`tv-result-chip ${summary.oddEven}`}>
              {LABEL[summary.oddEven]}
              <small>{summary.oddCount}–{20 - summary.oddCount}</small>
            </div>
          </div>
        )}

        {stats && !latest && (
          <div className="tv-stats">
            <div className="tv-stats-title">HOT · last {stats.draws} games</div>
            <div className="tv-chips">
              {stats.hot.map((x) => <span key={x.n} className="tv-chip hot">{x.n}</span>)}
            </div>
            <div className="tv-stats-title">COLD</div>
            <div className="tv-chips">
              {stats.cold.map((x) => <span key={x.n} className="tv-chip cold">{x.n}</span>)}
            </div>
          </div>
        )}

        <div className="tv-history">
          <div className="tv-stats-title">PREVIOUS GAMES</div>
          {history.filter((d) => d.drawId !== round.draw?.drawId).slice(0, 5).map((d) => {
            const s = summarize(d.numbers);
            return (
              <div key={d.drawId} className="tv-history-row">
                <span>#{d.drawId}</span>
                <span>{LABEL[s.headsTails]}</span>
                <span>{LABEL[s.oddEven]}</span>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
