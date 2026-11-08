import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import socket from "../socket";
import "./FastKeno.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const REVEAL_STEP_MS = 1000; // one number per second during the draw

const TABS = [
  { id: "play", label: "🎱 Play" },
  { id: "history", label: "🕘 History" },
  { id: "results", label: "🏆 Results" },
];
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
const BADGE = {
  numbers: { text: "NUM", cls: "num" },
  heads: { text: "H", cls: "heads" },
  tails: { text: "T", cls: "tails" },
  ht_evens: { text: "EV", cls: "evens" },
  odd: { text: "ODD", cls: "odd" },
  even: { text: "EVN", cls: "even" },
  oe_evens: { text: "EV", cls: "evens" },
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

const timeOf = (ms) =>
  new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });

const FastKeno = () => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData;
  const myName = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name;

  const [tab, setTab] = useState("play");
  const [config, setConfig] = useState(null);
  const [paytable, setPaytable] = useState({});
  const [sideBets, setSideBets] = useState({});
  const [clockOffset, setClockOffset] = useState(0); // serverTime - localTime
  const [nextDraw, setNextDraw] = useState({ id: null, at: 0, closeAt: 0 });
  const [now, setNow] = useState(Date.now());

  const [lastDraw, setLastDraw] = useState(null); // { drawId, numbers }
  const [revealed, setRevealed] = useState([]);
  const [revealDone, setRevealDone] = useState(true);
  const [results, setResults] = useState([]);

  const [mode, setMode] = useState("numbers");
  const [sideChoice, setSideChoice] = useState({ ht: "heads", oe: "odd" });
  const [picks, setPicks] = useState([]);
  const [stake, setStake] = useState(2);
  const [draws, setDraws] = useState(1);
  const [wallet, setWallet] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [placing, setPlacing] = useState(false);

  const [live, setLive] = useState({ drawId: null, players: 0, tickets: 0, list: [] });
  const [online, setOnline] = useState(0);

  const revealTimer = useRef(null);
  const picksRef = useRef([]);
  const picksAtDraw = useRef("");
  const liveDrawId = useRef(null);

  // ---------- data loading ----------
  const loadState = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/state`);
      setClockOffset(data.serverNow - Date.now());
      setConfig(data.config);
      setPaytable(data.paytable);
      setSideBets(data.sideBets || {});
      setStake((s) => Math.max(s, data.config.MIN_STAKE));
      setNextDraw({ id: data.nextDrawId, at: data.nextDrawAt, closeAt: data.betCloseAt });
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

  const loadResults = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/results?limit=30`);
      setResults(data.draws || []);
    } catch {
      /* keep current values */
    }
  }, []);

  const loadPlayers = useCallback(async (drawId) => {
    if (!drawId) return;
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/players?drawId=${drawId}`);
      if (liveDrawId.current !== drawId) return; // a newer draw started meanwhile
      setLive({ drawId: data.drawId, players: data.players, tickets: data.tickets, list: data.list });
      setOnline(data.online);
    } catch {
      /* keep current values */
    }
  }, []);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    tg?.disableVerticalSwipes?.(); // stop Telegram closing the app when scrolling
    loadState();
    loadMine();
    loadResults();
    socket.emit("keno:join");
    const rejoin = () => socket.emit("keno:join");
    socket.on("connect", rejoin);
    return () => {
      socket.emit("keno:leave");
      socket.off("connect", rejoin);
    };
  }, [loadState, loadMine, loadResults, tg]);

  // Load the live players list whenever the open draw changes.
  useEffect(() => {
    if (!nextDraw.id) return;
    liveDrawId.current = nextDraw.id;
    setLive({ drawId: nextDraw.id, players: 0, tickets: 0, list: [] });
    loadPlayers(nextDraw.id);
  }, [nextDraw.id, loadPlayers]);

  // ---------- clock ----------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // ---------- socket events ----------
  useEffect(() => {
    const onDraw = (d) => {
      setClockOffset(d.serverNow - Date.now());
      setNextDraw({
        id: d.nextDrawId,
        at: d.nextDrawAt,
        closeAt: d.nextDrawAt - (config?.BET_CLOSE_MS ?? 5000),
      });
      setLastDraw({ drawId: d.drawId, numbers: d.numbers });

      // Remember the board as it was when the draw started.
      picksAtDraw.current = picksRef.current.slice().sort((a, b) => a - b).join(",");

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
          // Game over: clear the board so the same numbers aren't bet again by accident.
          // If the player already picked new numbers during the draw, keep those.
          setPicks((p) => (p.slice().sort((a, b) => a - b).join(",") === picksAtDraw.current ? [] : p));
          // Only now show the result in the Results tab and update wallet/tickets.
          setResults((r) =>
            [{ drawId: d.drawId, drawAt: d.drawId * 60000, numbers: d.numbers, ...summarize(d.numbers) }, ...r.filter((x) => x.drawId !== d.drawId)].slice(0, 30)
          );
          loadMine();
        }
      }, REVEAL_STEP_MS);
    };

    const onBet = ({ tickets: incoming }) => {
      const mine = incoming.filter((t) => t.drawId === liveDrawId.current);
      if (!mine.length) return;
      setLive((l) => {
        const known = new Set(l.list.map((t) => t.id));
        const fresh = mine.filter((t) => !known.has(t.id));
        if (!fresh.length) return l;
        const list = [...fresh, ...l.list];
        return { ...l, list, tickets: list.length, players: new Set(list.map((t) => t.name)).size };
      });
    };

    const onOnline = ({ online: n }) => setOnline(n);

    socket.on("keno:draw", onDraw);
    socket.on("keno:bet", onBet);
    socket.on("keno:online", onOnline);
    return () => {
      socket.off("keno:draw", onDraw);
      socket.off("keno:bet", onBet);
      socket.off("keno:online", onOnline);
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
      loadResults();
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextDraw.at]);

  picksRef.current = picks;

  // ---------- derived ----------
  const maxPicks = config?.MAX_PICKS ?? 10;
  const minStake = config?.MIN_STAKE ?? 7;
  const maxStake = config?.MAX_STAKE ?? 100;
  const clampStake = (v) => Math.min(maxStake, Math.max(minStake, Math.round(Number(v) || minStake)));
  const drawOptions = config?.MULTI_DRAW_OPTIONS ?? [1, 5, 10];
  const secondsToDraw = Math.max(0, Math.ceil((nextDraw.at - serverNow) / 1000));
  const bettingOpen = serverNow < nextDraw.closeAt;
  const drawSet = useMemo(() => new Set(revealed), [revealed]);
  const pickSet = useMemo(() => new Set(picks), [picks]);
  const intervalSec = (config?.DRAW_INTERVAL_MS ?? 60000) / 1000;
  const progress = Math.min(100, Math.max(0, 100 - (secondsToDraw / intervalSec) * 100));
  const lastSummary = lastDraw && revealDone ? summarize(lastDraw.numbers) : null;
  const betType = mode === "numbers" ? "numbers" : sideChoice[mode];
  const safeStake = clampStake(stake);
  const totalCost = safeStake * draws;
  const myOpenTickets = tickets.filter((t) => t.status === "pending");
  // My numbers in the draw being shown, so hits light up even after the board is cleared.
  const myDrawPicks = useMemo(() => {
    const set = new Set();
    if (lastDraw) tickets.filter((t) => t.drawId === lastDraw.drawId).forEach((t) => (t.picks || []).forEach((n) => set.add(n)));
    return set;
  }, [tickets, lastDraw]);
  const calling = !revealDone && revealed.length > 0;
  const latestCalled = revealed[revealed.length - 1];
  const drawingTickets = lastDraw ? tickets.filter((t) => t.drawId === lastDraw.drawId) : [];
  const waitingTickets = tickets.filter((t) => t.drawId === nextDraw.id && t.drawId !== lastDraw?.drawId);
  const myHitsNow = drawingTickets.reduce(
    (sum, t) => sum + ((t.betType || "numbers") === "numbers" ? t.picks.filter((n) => drawSet.has(n)).length : 0),
    0
  );
  const myPicksTotal = drawingTickets.reduce((sum, t) => sum + ((t.betType || "numbers") === "numbers" ? t.picks.length : 0), 0);
  const calledHeads = revealed.filter((n) => n <= 40).length;
  const calledOdd = revealed.filter((n) => n % 2 === 1).length;

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
        stake: safeStake,
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

  // ---------- pieces ----------
  const Badge = ({ type }) => {
    const b = BADGE[type] || BADGE.numbers;
    return <span className={`kn-badge ${b.cls}`}>{b.text}</span>;
  };

  // done = the draw is finished, so numbers that weren't called are shown as missed
  const PickChips = ({ nums, drawn, done }) => (
    <div className="kn-chips">
      {nums.map((n) => {
        const hit = drawn && drawn.has(n);
        return (
          <span key={n} className={`kn-chip ${hit ? "hit" : done ? "miss" : ""}`}>{n}</span>
        );
      })}
    </div>
  );

  // A ticket in the draw being called (live highlights) or waiting for the next draw.
  const LiveTicket = ({ t, live }) => {
    const type = t.betType || "numbers";
    const done = live && revealDone;
    const settled = t.status !== "pending";
    const hits = type === "numbers" && live ? t.picks.filter((n) => drawSet.has(n)) : [];
    const misses = done && type === "numbers" ? t.picks.filter((n) => !drawSet.has(n)) : [];
    const currentMult = type === "numbers" ? paytable[t.picks.length]?.[hits.length] || 0 : 0;
    return (
      <div className={`kn-ticket ${done && settled ? t.status : ""}`}>
        <div className="kn-ticket-top">
          <span className="kn-ticket-title"><Badge type={type} /> {BET_LABEL[type]} · {t.stake} ETB</span>
          <span className="kn-ticket-state">
            {!live && <span className="kn-muted">⏳ Waiting for draw #{t.drawId}</span>}
            {live && !done && type === "numbers" && <span className="kn-gold">{hits.length} / {t.picks.length} hit</span>}
            {live && !done && type !== "numbers" && <span className="kn-muted">Calling…</span>}
            {done && settled && t.status === "won" && <span className="kn-green kn-big">WON +{t.payout}</span>}
            {done && settled && t.status === "lost" && <span className="kn-red">No win</span>}
            {done && !settled && <span className="kn-muted">Checking…</span>}
          </span>
        </div>
        {type === "numbers" ? (
          <PickChips nums={t.picks} drawn={live ? drawSet : null} done={done} />
        ) : (
          live && (
            <div className="kn-side-live">
              {["heads", "tails", "ht_evens"].includes(type)
                ? `1–40: ${calledHeads}  ·  41–80: ${revealed.length - calledHeads}`
                : `Odd: ${calledOdd}  ·  Even: ${revealed.length - calledOdd}`}
            </div>
          )
        )}
        {live && type === "numbers" && (
          <div className="kn-ticket-foot">
            {done ? (
              <>
                <span>Got: <b className="kn-gold">{hits.length ? hits.join(", ") : "none"}</b></span>
                <span>Missed: <b className="kn-red">{misses.length ? misses.join(", ") : "none"}</b></span>
              </>
            ) : (
              <span className="kn-muted">
                {currentMult ? `Winning now: ${Math.min(t.stake * currentMult, config?.MAX_WIN_PER_TICKET ?? Infinity)} ETB` : "No prize yet — keep watching"}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------- render ----------
  return (
    <div className="keno">
      <div className="keno-inner">
        {/* header */}
        <div className="kn-head">
          <div>
            <div className="kn-title">Fast Keno</div>
            <div className="kn-sub">
              Draw #{nextDraw.id ?? "—"} ·{" "}
              <span className={bettingOpen ? "kn-open" : "kn-closed"}>
                {bettingOpen ? `${secondsToDraw}s left` : "Drawing…"}
              </span>
            </div>
          </div>
          <div className="kn-wallet">{wallet === null ? "—" : wallet.toFixed(2)} ETB</div>
        </div>
        <div className="kn-bar"><div className="kn-bar-fill" style={{ width: `${progress}%` }} /></div>

        {/* stats strip (like the GK / DEF / MID strip) */}
        <div className="kn-stats">
          <div><span>PLAYERS</span><strong>{live.players}</strong></div>
          <div><span>TICKETS</span><strong>{live.tickets}</strong></div>
          <div><span>ONLINE</span><strong>{online}</strong></div>
          <div><span>MY OPEN</span><strong>{myOpenTickets.length}</strong></div>
        </div>

        {/* main tabs */}
        <div className="kn-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`kn-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ===================== PLAY ===================== */}
        {tab === "play" && (
          <>
            <section className="kn-card">
              <div className="kn-card-head">
                <span>{calling ? "Drawing" : "Last draw"} {lastDraw ? `#${lastDraw.drawId}` : ""}</span>
                {lastSummary && (
                  <span className="kn-tags">
                    <span className="kn-tag">{OUTCOME_LABEL[lastSummary.headsTails]} {lastSummary.headsCount}–{20 - lastSummary.headsCount}</span>
                    <span className="kn-tag">{OUTCOME_LABEL[lastSummary.oddEven]} {lastSummary.oddCount}–{20 - lastSummary.oddCount}</span>
                  </span>
                )}
              </div>
              {calling && (
                <div className="kn-calling">
                  <span key={latestCalled} className={`kn-calling-ball ${latestCalled > 40 ? "tail" : ""} ${myDrawPicks.has(latestCalled) ? "hit" : ""}`}>
                    {latestCalled}
                  </span>
                  <div>
                    <div className="kn-calling-label">Now calling</div>
                    <div className="kn-calling-count">{revealed.length} / 20</div>
                  </div>
                  {myPicksTotal > 0 && (
                    <div className="kn-calling-mine">
                      <div className="kn-calling-label">Your hits</div>
                      <div className="kn-calling-count kn-gold">{myHitsNow}</div>
                    </div>
                  )}
                </div>
              )}
              <div className="kn-balls">
                {revealed.length === 0 && <span className="kn-muted">Waiting for the next draw…</span>}
                {revealed.map((n) => (
                  <span key={n} className={`kn-ball ${n > 40 ? "tail" : ""} ${myDrawPicks.has(n) ? "hit" : ""}`}>{n}</span>
                ))}
              </div>
            </section>

            <div className="kn-pills">
              {MODES.map((m) => (
                <button key={m.id} className={`kn-pill ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>

            {mode === "numbers" ? (
              <section className="kn-grid">
                {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => {
                  const picked = pickSet.has(n);
                  const drawn = drawSet.has(n);
                  return (
                    <button
                      key={n}
                      className={`kn-cell ${picked ? "picked" : ""} ${drawn ? "drawn" : ""} ${picked && drawn ? "hit" : ""}`}
                      onClick={() => togglePick(n)}
                    >
                      {n}
                    </button>
                  );
                })}
              </section>
            ) : (
              <section className="kn-card">
                <p className="kn-muted kn-mt0">
                  {mode === "ht"
                    ? "Heads wins if more of the 20 numbers are 1–40, Tails if more are 41–80. Evens wins on a 10–10 split."
                    : "Odd wins if more of the 20 numbers are odd, Even if more are even. Evens wins on a 10–10 split."}
                </p>
                <div className="kn-side">
                  {SIDE_OPTIONS[mode].map((b) => (
                    <button
                      key={b}
                      className={`kn-side-btn ${sideChoice[mode] === b ? "active" : ""} ${b.includes("evens") ? "evens" : ""}`}
                      onClick={() => setSideChoice((s) => ({ ...s, [mode]: b }))}
                    >
                      <span>{BET_LABEL[b].replace("H/T ", "").replace("O/E ", "")}</span>
                      <strong>×{sideBets[b]?.multiplier ?? "—"}</strong>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* my tickets: live during the draw, then result; plus tickets waiting for the next draw */}
            {(drawingTickets.length > 0 || waitingTickets.length > 0) && (
              <section className="kn-card">
                {drawingTickets.length > 0 && (
                  <>
                    <div className="kn-card-head">
                      <span>My ticket{drawingTickets.length > 1 ? "s" : ""} · Draw #{lastDraw.drawId}</span>
                      <span className={calling ? "kn-gold" : "kn-muted"}>{calling ? `Calling ${revealed.length}/20` : "Result"}</span>
                    </div>
                    {drawingTickets.map((t) => <LiveTicket key={t._id} t={t} live />)}
                  </>
                )}
                {waitingTickets.length > 0 && (
                  <>
                    <div className={`kn-card-head ${drawingTickets.length ? "kn-mt12" : ""}`}>
                      <span>Next draw #{nextDraw.id}</span>
                      <span className="kn-muted">{waitingTickets.length} ticket{waitingTickets.length > 1 ? "s" : ""}</span>
                    </div>
                    {waitingTickets.map((t) => <LiveTicket key={t._id} t={t} live={false} />)}
                  </>
                )}
              </section>
            )}

            {/* my selection */}
            <section className="kn-card">
              <div className="kn-card-head">
                <span>My selection</span>
                {mode === "numbers" && (
                  <span className="kn-row-btns">
                    <button className="kn-ghost" onClick={quickPick}>🎲 Auto</button>
                    <button className="kn-ghost" onClick={() => setPicks([])}>Reset</button>
                  </span>
                )}
              </div>
              {mode === "numbers" ? (
                picks.length ? (
                  <>
                    <PickChips nums={[...picks].sort((a, b) => a - b)} drawn={revealed.length ? drawSet : null} />
                    <div className="kn-muted kn-mt6">{picks.length}/{maxPicks} picked</div>
                  </>
                ) : (
                  <p className="kn-muted kn-mt0">Tap numbers on the board, or press Auto.</p>
                )
              ) : (
                <div className="kn-selected-side"><Badge type={betType} /> {BET_LABEL[betType]} · pays ×{sideBets[betType]?.multiplier ?? "—"}</div>
              )}

              <div className="kn-label">Stake per draw (ETB)</div>
              <div className="kn-stake">
                <button className="kn-step" onClick={() => setStake((v) => clampStake(v - 1))} disabled={safeStake <= minStake} aria-label="Decrease stake">−</button>
                <input
                  className="kn-stake-input"
                  type="number"
                  inputMode="numeric"
                  min={minStake}
                  max={maxStake}
                  value={stake}
                  onChange={(e) => setStake(e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={() => setStake((v) => clampStake(v))}
                />
                <button className="kn-step" onClick={() => setStake((v) => clampStake(v + 1))} disabled={safeStake >= maxStake} aria-label="Increase stake">+</button>
              </div>
              <div className="kn-hint">Min {minStake} · Max {maxStake}</div>

              <div className="kn-label">Play for</div>
              <div className="kn-draws">
                {drawOptions.map((d) => (
                  <button key={d} className={`kn-pill ${draws === d ? "active" : ""}`} onClick={() => setDraws(d)}>
                    {d} draw{d > 1 ? "s" : ""}
                  </button>
                ))}
              </div>

              <button className="kn-bet" disabled={placing || (betType === "numbers" && !picks.length)} onClick={placeBet}>
                {placing ? "Placing…" : `Bet ${totalCost} ETB — ${BET_LABEL[betType]}${draws > 1 ? ` × ${draws}` : ""}`}
              </button>

              {mode === "numbers" && picks.length > 0 && (
                <table className="kn-paytable">
                  <thead><tr><th>Matches</th><th>Pays</th><th>You win</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.matches}>
                        <td>{r.matches}</td>
                        <td>×{r.mult}</td>
                        <td className="kn-green">{Math.min(safeStake * r.mult, config?.MAX_WIN_PER_TICKET ?? Infinity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* live players in this draw */}
            <section className="kn-list">
              <div className="kn-list-head">
                <span>Players in draw #{live.drawId ?? "—"}</span>
                <span className="kn-live"><i /> LIVE · {live.players} player{live.players === 1 ? "" : "s"}</span>
              </div>
              {live.list.length === 0 && <p className="kn-muted kn-pad">No tickets yet for this draw. Be the first!</p>}
              {live.list.map((t) => (
                <div key={t.id} className={`kn-row ${myName && t.name === myName ? "me" : ""}`}>
                  <div className="kn-avatar">
                    {Array.from((t.name || "").replace(/[^\p{L}\p{N}]/gu, ""))[0]?.toUpperCase() || "?"}
                    <Badge type={t.betType} />
                  </div>
                  <div className="kn-row-main">
                    <div className="kn-row-name">{t.name}{myName && t.name === myName ? " (you)" : ""}</div>
                    {t.betType === "numbers" ? (
                      <PickChips nums={t.picks} />
                    ) : (
                      <div className="kn-muted">{BET_LABEL[t.betType]}</div>
                    )}
                  </div>
                  <div className="kn-row-right">
                    <span className="kn-star">★ {t.betType === "numbers" ? t.picks.length : "—"}</span>
                    <span className="kn-green">{t.stake}</span>
                  </div>
                </div>
              ))}
            </section>

            <p className="kn-fine">
              20 of 80 numbers are drawn at random every minute. Prizes come from fixed tables, so everyone has the
              same chance. On average every bet type pays back about 80% of stakes.
              {config ? ` Max win per ticket: ${config.MAX_WIN_PER_TICKET.toLocaleString()} ETB.` : ""}
            </p>
          </>
        )}

        {/* ===================== HISTORY ===================== */}
        {tab === "history" && (
          <section className="kn-list">
            <div className="kn-list-head">
              <span>My tickets</span>
              <span className="kn-muted">last {tickets.length}</span>
            </div>
            {tickets.length === 0 && <p className="kn-muted kn-pad">No tickets yet. Place a bet in the Play tab.</p>}
            {tickets.map((t) => {
              const draw = results.find((d) => d.drawId === t.drawId);
              const drawn = draw ? new Set(draw.numbers) : null;
              const type = t.betType || "numbers";
              return (
                <div key={t._id} className={`kn-row ${t.status}`}>
                  <div className="kn-avatar small">
                    #{String(t.drawId).slice(-3)}
                    <Badge type={type} />
                  </div>
                  <div className="kn-row-main">
                    <div className="kn-row-name">
                      Draw #{t.drawId} · {BET_LABEL[type]}
                    </div>
                    {type === "numbers" ? <PickChips nums={t.picks} drawn={drawn} /> : null}
                    <div className="kn-muted">
                      Stake {t.stake} ETB{t.groupSize > 1 ? ` · ${t.groupSize}-draw ticket` : ""} · {timeOf(t.createdAt)}
                    </div>
                  </div>
                  <div className="kn-row-right">
                    {t.status === "pending" && <span className="kn-muted">⏳ Waiting</span>}
                    {t.status === "won" && <span className="kn-green kn-big">+{t.payout}</span>}
                    {t.status === "lost" && (
                      <span className="kn-muted">{type === "numbers" ? `${t.matches} hit${t.matches === 1 ? "" : "s"}` : "Lost"}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ===================== RESULTS ===================== */}
        {tab === "results" && (
          <section className="kn-list">
            <div className="kn-list-head">
              <span>Draw results</span>
              <span className="kn-muted">last {results.length}</span>
            </div>
            {results.length === 0 && <p className="kn-muted kn-pad">No draws yet.</p>}
            {results.map((d) => {
              const s = summarize(d.numbers);
              return (
                <div key={d.drawId} className="kn-result">
                  <div className="kn-result-head">
                    <span className="kn-row-name">Draw #{d.drawId}</span>
                    <span className="kn-muted">{d.drawAt ? timeOf(d.drawAt) : ""}</span>
                  </div>
                  <div className="kn-result-balls">
                    {d.numbers.map((n) => (
                      <span key={n} className={`kn-mini ${n > 40 ? "tail" : ""}`}>{n}</span>
                    ))}
                  </div>
                  <div className="kn-tags">
                    <span className={`kn-tag ${s.headsTails}`}>{OUTCOME_LABEL[s.headsTails]} {s.headsCount}–{20 - s.headsCount}</span>
                    <span className={`kn-tag ${s.oddEven}`}>{OUTCOME_LABEL[s.oddEven]} {s.oddCount}–{20 - s.oddCount}</span>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default FastKeno;
