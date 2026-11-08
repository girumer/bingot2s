import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import socket from "../socket";
import "./KenoTV.css";

// Full-screen display for a TV or big screen: countdown, live draw on the
// 1–80 board, last result, previous draws and hot/cold numbers.
// Open /KenoTV in a browser and press F11 for full screen.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const REVEAL_STEP_MS = 1000; // one number per second

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
  const [nextDraw, setNextDraw] = useState({ id: null, at: 0, closeAt: 0 });
  const [interval, setIntervalMs] = useState(60000);
  const [now, setNow] = useState(Date.now());
  const [current, setCurrent] = useState(null); // { drawId, numbers }
  const [revealed, setRevealed] = useState([]);
  const [revealing, setRevealing] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const timer = useRef(null);

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
      setClockOffset(data.serverNow - Date.now());
      setIntervalMs(data.config.DRAW_INTERVAL_MS);
      setNextDraw({ id: data.nextDrawId, at: data.nextDrawAt, closeAt: data.betCloseAt });
      setHistory(data.recentDraws || []);
      if (data.recentDraws?.length) {
        setCurrent((c) => c || data.recentDraws[0]);
        setRevealed((r) => (r.length ? r : data.recentDraws[0].numbers));
      }
    } catch {
      /* retry on next cycle */
    }
  }, []);

  useEffect(() => {
    loadState();
    loadStats();
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [loadState, loadStats]);

  useEffect(() => {
    const onDraw = (d) => {
      setClockOffset(d.serverNow - Date.now());
      setNextDraw({ id: d.nextDrawId, at: d.nextDrawAt, closeAt: d.nextDrawAt - 5000 });
      setCurrent({ drawId: d.drawId, numbers: d.numbers });
      setHistory((h) => [{ drawId: d.drawId, numbers: d.numbers }, ...h.filter((x) => x.drawId !== d.drawId)].slice(0, 10));
      clearInterval(timer.current);
      setRevealed([]);
      setRevealing(true);
      let i = 0;
      timer.current = setInterval(() => {
        i += 1;
        setRevealed(d.numbers.slice(0, i));
        if (i >= d.numbers.length) {
          clearInterval(timer.current);
          setRevealing(false);
          loadStats();
        }
      }, REVEAL_STEP_MS);
    };
    socket.on("keno:draw", onDraw);
    return () => {
      socket.off("keno:draw", onDraw);
      clearInterval(timer.current);
    };
  }, [loadStats]);

  // Re-sync if a draw event is missed
  const serverNow = now + clockOffset;
  useEffect(() => {
    if (!nextDraw.at) return;
    const wait = nextDraw.at - serverNow + 5000;
    if (wait <= 0) return;
    const t = setTimeout(loadState, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextDraw.at]);

  const seconds = Math.max(0, Math.ceil((nextDraw.at - serverNow) / 1000));
  const closed = serverNow >= nextDraw.closeAt;
  const drawnSet = useMemo(() => new Set(revealed), [revealed]);
  const latest = revealed[revealed.length - 1];
  const summary = current && !revealing ? summarize(current.numbers) : null;
  const ringPct = Math.min(100, (seconds / (interval / 1000)) * 100);

  return (
    <div className="tv">
      <div className="tv-main">
        <div className="tv-board">
          {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`tv-cell ${n > 40 ? "tail" : ""} ${drawnSet.has(n) ? "on" : ""} ${n === latest && revealing ? "latest" : ""}`}
            >
              {n}
            </div>
          ))}
        </div>
        <div className="tv-board-foot">
          <span>HEADS 1–40</span>
          <span>DRAW #{current?.drawId ?? "—"} · {revealed.length}/20</span>
          <span>TAILS 41–80</span>
        </div>
      </div>

      <aside className="tv-side">
        <div className="tv-brand">🎱 FAST KENO</div>

        <div className="tv-countdown" style={{ "--pct": `${ringPct}%` }}>
          <div className="tv-countdown-inner">
            <div className="tv-seconds">{revealing ? "●" : seconds}</div>
            <div className="tv-countdown-label">
              {revealing ? "DRAWING" : closed ? "BETS CLOSED" : (
                <>NEXT DRAW<br />#{nextDraw.id ?? "—"}</>
              )}
            </div>
          </div>
        </div>

        {revealing && latest && <div className="tv-latest">{latest}</div>}

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

        {stats && (
          <div className="tv-stats">
            <div className="tv-stats-title">HOT · last {stats.draws} draws</div>
            <div className="tv-chips">
              {stats.hot.map((x) => (
                <span key={x.n} className="tv-chip hot">{x.n}</span>
              ))}
            </div>
            <div className="tv-stats-title">COLD</div>
            <div className="tv-chips">
              {stats.cold.map((x) => (
                <span key={x.n} className="tv-chip cold">{x.n}</span>
              ))}
            </div>
          </div>
        )}

        <div className="tv-history">
          <div className="tv-stats-title">PREVIOUS DRAWS</div>
          {history.slice(revealing ? 1 : 1, 6).map((d) => {
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
