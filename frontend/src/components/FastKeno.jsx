import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import socket from "../socket";
import "./FastKeno.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const STAKE_OPTIONS = [5, 10, 20, 50, 100];
const REVEAL_STEP_MS = 180; // speed of the draw animation

const MODES = [
  { id: "numbers", label: "Numbers" },
  { id: "ht", label: "Heads / Tails" },
  { id: "oe", label: "Odd / Even" },
];
const SIDE_OPTIONS = {
  ht: ["heads", "ht_evens", "tails"],
  oe: ["odd", "oe_evens", "even"],
};
const BET_LABEL = {
  numbers: "Numbers",
  heads: "Heads",
  tails: "Tails",
  ht_evens: "H/T Evens",
  odd: "Odd",
  even: "Even",
  oe_evens: "O/E Evens",
};
const OUTCOME_LABEL = {
  heads: "Heads",
  tails: "Tails",
  ht_evens: "Evens",
  odd: "Odd",
  even: "Even",
  oe_evens: "Evens",
};

function summarize(numbers) {
  const headsCount = numbers.filter((n) => n <= 40).length;
  const oddCount = numbers.filter((n) => n % 2 === 1).length;
  return {
    headsCount,
    oddCount,
    headsTails: headsCount > 10 ? "heads" : headsCount < 10 ? "tails" : "ht_evens",
    oddEven: oddCount > 10 ? "odd" : oddCount < 10 ? "even" : "oe_evens",
  };
}

const FastKeno = () => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData;

  const [config, setConfig] = useState(null);
  const [paytable, setPaytable] = useState({});
  const [sideBets, setSideBets] = useState({});
  const [clockOffset, setClockOffset] = useState(0); // serverTime - localTime
  const [nextDraw, setNextDraw] = useState({ id: null, at: 0, closeAt: 0 });
  const [now, setNow] = useState(Date.now());

  const [lastDraw, setLastDraw] = useState(null); // { drawId, numbers }
  const [revealed, setRevealed] = useState([]);
  const [revealDone, setRevealDone] = useState(true);
  const [history, setHistory] = useState([]);

  const [mode, setMode] = useState("numbers");
  const [sideChoice, setSideChoice] = useState({ ht: "heads", oe: "odd" });
  const [picks, setPicks] = useState([]);
  const [stake, setStake] = useState(10);
  const [draws, setDraws] = useState(1);
  const [wallet, setWallet] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [placing, setPlacing] = useState(false);

  const revealTimer = useRef(null);

  // ---------- data loading ----------
  const loadState = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/state`);
      setClockOffset(data.serverNow - Date.now());
      setConfig(data.config);
      setPaytable(data.paytable);
      setSideBets(data.sideBets || {});
      setNextDraw({ id: data.nextDrawId, at: data.nextDrawAt, closeAt: data.betCloseAt });
      setHistory(data.recentDraws || []);
      if (data.recentDraws?.length) {
        setLastDraw((prev) => prev || data.recentDraws[0]);
        setRevealed((prev) => (prev.length ? prev : data.recentDraws[0].numbers));
      }
    } catch {
      toast.error("Could not load Fast Keno. Check your connection.");
    }
  }, []);

  const loadMine = useCallback(async () => {
    if (!initData) return;
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/keno/my-tickets`, { initData });
      setWallet(data.wallet);
      setTickets(data.tickets);
    } catch {
      /* keep current values */
    }
  }, [initData]);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    loadState();
    loadMine();
  }, [loadState, loadMine, tg]);

  // ---------- clock ----------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // ---------- live draws ----------
  useEffect(() => {
    const onDraw = (d) => {
      setClockOffset(d.serverNow - Date.now());
      setNextDraw({
        id: d.nextDrawId,
        at: d.nextDrawAt,
        closeAt: d.nextDrawAt - (config?.BET_CLOSE_MS ?? 5000),
      });
      setLastDraw({ drawId: d.drawId, numbers: d.numbers });
      setHistory((h) =>
        [{ drawId: d.drawId, numbers: d.numbers, ...summarize(d.numbers) }, ...h.filter((x) => x.drawId !== d.drawId)].slice(0, 10)
      );

      clearInterval(revealTimer.current);
      setRevealed([]);
      setRevealDone(false);
      let i = 0;
      revealTimer.current = setInterval(() => {
        i += 1;
        setRevealed(d.numbers.slice(0, i));
        if (i >= d.numbers.length) {
          clearInterval(revealTimer.current);
          setRevealDone(true);
          loadMine();
        }
      }, REVEAL_STEP_MS);
    };
    socket.on("keno:draw", onDraw);
    return () => {
      socket.off("keno:draw", onDraw);
      clearInterval(revealTimer.current);
    };
  }, [config, loadMine]);

  // Fallback if a socket event is missed: re-sync shortly after the draw time.
  const serverNow = now + clockOffset;
  useEffect(() => {
    if (!nextDraw.at) return;
    const wait = nextDraw.at - serverNow + 4000;
    if (wait <= 0) return;
    const t = setTimeout(() => {
      loadState();
      loadMine();
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextDraw.at]);

  // ---------- derived ----------
  const maxPicks = config?.MAX_PICKS ?? 10;
  const drawOptions = config?.MULTI_DRAW_OPTIONS ?? [1, 5, 10];
  const secondsToDraw = Math.max(0, Math.ceil((nextDraw.at - serverNow) / 1000));
  const bettingOpen = serverNow < nextDraw.closeAt;
  const drawSet = useMemo(() => new Set(revealed), [revealed]);
  const pickSet = useMemo(() => new Set(picks), [picks]);
  const intervalSec = (config?.DRAW_INTERVAL_MS ?? 60000) / 1000;
  const progress = Math.min(100, Math.max(0, 100 - (secondsToDraw / intervalSec) * 100));
  const lastSummary = lastDraw && revealDone ? summarize(lastDraw.numbers) : null;
  const betType = mode === "numbers" ? "numbers" : sideChoice[mode];
  const totalCost = stake * draws;

  const rows = useMemo(() => {
    const row = paytable[picks.length] || {};
    return Object.entries(row)
      .map(([m, mult]) => ({ matches: Number(m), mult }))
      .sort((a, b) => b.matches - a.matches);
  }, [paytable, picks.length]);

  // ---------- actions ----------
  const togglePick = (n) => {
    if (mode !== "numbers") return;
    setPicks((p) => {
      if (p.includes(n)) return p.filter((x) => x !== n);
      if (p.length >= maxPicks) {
        toast.info(`You can pick up to ${maxPicks} numbers.`);
        return p;
      }
      return [...p, n];
    });
  };

  const quickPick = () => {
    const count = picks.length || 5;
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setPicks(pool.slice(0, count));
  };

  const placeBet = async () => {
    if (!initData) return toast.error("Open Fast Keno from the Telegram bot.");
    if (betType === "numbers" && !picks.length) return toast.info("Pick at least 1 number.");
    if (wallet !== null && wallet < totalCost) return toast.error("Insufficient balance.");
    setPlacing(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/keno/bet`, {
        initData,
        betType,
        picks: betType === "numbers" ? picks : [],
        stake,
        draws,
      });
      setWallet(data.wallet);
      setTickets((t) => [...[...data.tickets].reverse(), ...t].slice(0, 30));
      const first = data.tickets[0].drawId;
      toast.success(
        draws > 1 ? `Ticket placed for draws #${first}–#${first + draws - 1}` : `Ticket placed for draw #${first}`
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not place ticket.");
    } finally {
      setPlacing(false);
    }
  };

  // ---------- render ----------
  return (
    <div className="keno">
      <header className="keno-top">
        <div className="keno-title">🎱 Fast Keno</div>
        <div className="keno-wallet">💰 {wallet === null ? "—" : wallet.toFixed(2)}</div>
      </header>

      <section className="keno-timer">
        <div className="keno-timer-row">
          <span>Draw #{nextDraw.id ?? "—"}</span>
          <span className={bettingOpen ? "open" : "closed"}>
            {bettingOpen ? `Draw in ${secondsToDraw}s` : "Betting closed — drawing…"}
          </span>
        </div>
        <div className="keno-bar">
          <div className="keno-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="keno-last">
        <div className="keno-section-label keno-last-head">
          <span>Last draw {lastDraw ? `#${lastDraw.drawId}` : ""}</span>
          {lastSummary && (
            <span className="keno-outcomes">
              <span className="keno-tag">{OUTCOME_LABEL[lastSummary.headsTails]} {lastSummary.headsCount}–{20 - lastSummary.headsCount}</span>
              <span className="keno-tag">{OUTCOME_LABEL[lastSummary.oddEven]} {lastSummary.oddCount}–{20 - lastSummary.oddCount}</span>
            </span>
          )}
        </div>
        <div className="keno-balls">
          {revealed.length === 0 && <span className="keno-muted">Waiting for the next draw…</span>}
          {revealed.map((n) => (
            <span key={n} className={`keno-ball ${n > 40 ? "tail" : ""} ${pickSet.has(n) ? "hit" : ""}`}>{n}</span>
          ))}
        </div>
      </section>

      <div className="keno-tabs">
        {MODES.map((m) => (
          <button key={m.id} className={`keno-tab ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "numbers" ? (
        <section className="keno-grid">
          {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => {
            const picked = pickSet.has(n);
            const drawn = drawSet.has(n);
            return (
              <button
                key={n}
                className={`keno-cell ${n === 41 ? "split" : ""} ${picked ? "picked" : ""} ${drawn ? "drawn" : ""} ${picked && drawn ? "hit" : ""}`}
                onClick={() => togglePick(n)}
              >
                {n}
              </button>
            );
          })}
        </section>
      ) : (
        <section className="keno-side">
          <p className="keno-muted">
            {mode === "ht"
              ? "Heads wins if more of the 20 numbers are 1–40, Tails if more are 41–80. Evens wins on a 10–10 split."
              : "Odd wins if more of the 20 numbers are odd, Even if more are even. Evens wins on a 10–10 split."}
          </p>
          <div className="keno-side-options">
            {SIDE_OPTIONS[mode].map((b) => (
              <button
                key={b}
                className={`keno-side-btn ${sideChoice[mode] === b ? "active" : ""} ${b.includes("evens") ? "evens" : ""}`}
                onClick={() => setSideChoice((s) => ({ ...s, [mode]: b }))}
              >
                <span>{BET_LABEL[b].replace("H/T ", "").replace("O/E ", "")}</span>
                <strong>×{sideBets[b]?.multiplier ?? "—"}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="keno-controls">
        {mode === "numbers" && (
          <div className="keno-row">
            <span className="keno-muted">{picks.length}/{maxPicks} picked</span>
            <div className="keno-row-btns">
              <button className="keno-ghost" onClick={quickPick}>🎲 Quick pick</button>
              <button className="keno-ghost" onClick={() => setPicks([])}>Clear</button>
            </div>
          </div>
        )}

        <div className="keno-field-label">Stake per draw</div>
        <div className="keno-stakes">
          {STAKE_OPTIONS.map((s) => (
            <button key={s} className={`keno-chip ${stake === s ? "active" : ""}`} onClick={() => setStake(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="keno-field-label">Play for</div>
        <div className="keno-draws">
          {drawOptions.map((d) => (
            <button key={d} className={`keno-chip ${draws === d ? "active" : ""}`} onClick={() => setDraws(d)}>
              {d} draw{d > 1 ? "s" : ""}
            </button>
          ))}
        </div>

        <button
          className="keno-bet"
          disabled={placing || (betType === "numbers" && !picks.length)}
          onClick={placeBet}
        >
          {placing
            ? "Placing…"
            : `Bet ${totalCost} birr — ${BET_LABEL[betType]}${draws > 1 ? ` × ${draws} draws` : ""}`}
        </button>
      </section>

      {mode === "numbers" && (
        <section className="keno-paytable">
          <div className="keno-section-label">
            Paytable {picks.length ? `— ${picks.length} pick${picks.length > 1 ? "s" : ""}` : ""}
          </div>
          {picks.length === 0 ? (
            <p className="keno-muted">Pick numbers to see what you can win.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Matches</th><th>Pays</th><th>You win</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.matches}>
                    <td>{r.matches}</td>
                    <td>×{r.mult}</td>
                    <td>{Math.min(stake * r.mult, config?.MAX_WIN_PER_TICKET ?? Infinity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <p className="keno-fine">
        20 of 80 numbers are drawn at random every minute. Prizes come from fixed tables, so everyone
        has the same chance. On average every bet type pays back about 80% of stakes.
        {config ? ` Max win per ticket: ${config.MAX_WIN_PER_TICKET.toLocaleString()} birr.` : ""}
      </p>

      <section className="keno-tickets">
        <div className="keno-section-label">My tickets</div>
        {tickets.length === 0 && <p className="keno-muted">No tickets yet.</p>}
        {tickets.map((t) => (
          <div key={t._id} className={`keno-ticket ${t.status}`}>
            <div className="keno-ticket-head">
              <span>
                Draw #{t.drawId} · {BET_LABEL[t.betType || "numbers"]}
              </span>
              <span>
                {t.status === "pending" && "⏳ Waiting"}
                {t.status === "won" && `🎉 +${t.payout}`}
                {t.status === "lost" && ((t.betType || "numbers") === "numbers" ? `${t.matches} match${t.matches === 1 ? "" : "es"}` : "Lost")}
              </span>
            </div>
            {(t.betType || "numbers") === "numbers" && (
              <div className="keno-ticket-picks">
                {t.picks.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            )}
            <div className="keno-muted">
              Stake {t.stake}
              {t.groupSize > 1 ? ` · part of a ${t.groupSize}-draw ticket` : ""}
            </div>
          </div>
        ))}
      </section>

      {history.length > 1 && (
        <section className="keno-history">
          <div className="keno-section-label">Previous draws</div>
          {history.slice(1).map((d) => {
            const s = summarize(d.numbers);
            return (
              <div key={d.drawId} className="keno-history-row">
                <span className="keno-muted">#{d.drawId}</span>
                <span className="keno-history-nums">{d.numbers.join(" ")}</span>
                <span className="keno-history-tags">
                  {OUTCOME_LABEL[s.headsTails]} · {OUTCOME_LABEL[s.oddEven]}
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default FastKeno;
