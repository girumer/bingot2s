import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import socket from "../socket";
import "./FastKeno.css";

// Game flow (driven by the server):
//   waiting  – nobody has a ticket; nothing runs
//   betting  – first ticket placed; countdown so others can join
//   drawing  – 20 numbers called, one per second (focus view: numbers + tickets only)
//   checking – 5 seconds to check tickets (focus view stays)
// then the board comes back for the next game.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TABS = [
  { id: "play", label: "🎱 Play" },
  { id: "history", label: "🕘 History" },
  { id: "results", label: "🏆 Results" },
];
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
const OUTCOME_LABEL = { heads: "Heads", tails: "Tails", ht_evens: "Evens", odd: "Odd", even: "Even", oe_evens: "Evens" };

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
// Fallback mask for old tickets saved before phone labels: first***last.
const maskLabel = (text) => {
  const chars = Array.from(String(text || "player").replace(/\s/g, ""));
  return chars.length >= 2 ? `${chars[0]}***${chars[chars.length - 1]}` : "***";
};
const pad2 = (n) => String(n).padStart(2, "0");

// ---------- small pieces ----------
const Badge = ({ type }) => {
  const b = BADGE[type] || BADGE.numbers;
  return <span className={`kn-badge ${b.cls}`}>{b.text}</span>;
};

// drawn: numbers called so far; done: draw finished (uncalled picks = missed)
const PickChips = ({ nums, drawn, done }) => (
  <div className="kn-chips">
    {nums.map((n) => {
      const hit = drawn && drawn.has(n);
      return <span key={n} className={`kn-chip ${hit ? "hit" : done ? "miss" : ""}`}>{n}</span>;
    })}
  </div>
);

const FastKeno = () => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData;
  const myName = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name;

  const [tab, setTab] = useState("play");
  const [config, setConfig] = useState(null);
  const [paytable, setPaytable] = useState({});
  const [sideBets, setSideBets] = useState({});
  const [clockOffset, setClockOffset] = useState(0); // serverTime - localTime
  const [round, setRound] = useState({ drawId: null, phase: "waiting", drawAt: null, endsAt: null, draw: null });
  const [now, setNow] = useState(Date.now());

  const [results, setResults] = useState([]);
  const [picks, setPicks] = useState([]);
  const [stake, setStake] = useState(2);
  const [wallet, setWallet] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [placing, setPlacing] = useState(false);

  const [live, setLive] = useState({ drawId: null, players: 0, tickets: 0, list: [] });
  const [online, setOnline] = useState(0);
  const [listFilter, setListFilter] = useState("all");

  const liveDrawId = useRef(null);
  const picksRef = useRef([]);
  const picksAtDraw = useRef("");
  const prevPhase = useRef("waiting");
  picksRef.current = picks;

  // ---------- data loading ----------
  const applyRound = useCallback((r) => {
    if (!r) return;
    setClockOffset(r.serverNow - Date.now());
    setRound(r);
  }, []);

  const loadState = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/keno/state`);
      setConfig(data.config);
      setPaytable(data.paytable);
      setSideBets(data.sideBets || {});
      setStake((s) => Math.max(Number(s) || 0, data.config.MIN_STAKE));
      applyRound(data.round);
    } catch {
      toast.error("Could not load Fast Keno. Check your connection.");
    }
  }, [applyRound]);

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
      if (liveDrawId.current !== drawId) return;
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
    const rejoin = () => {
      socket.emit("keno:join");
      loadState(); // re-sync after a reconnect
    };
    socket.on("connect", rejoin);
    return () => {
      socket.emit("keno:leave");
      socket.off("connect", rejoin);
    };
  }, [loadState, loadMine, loadResults, tg]);

  // ---------- clock ----------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  // ---------- socket events ----------
  useEffect(() => {
    const onRound = (r) => applyRound(r);
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
    socket.on("keno:round", onRound);
    socket.on("keno:bet", onBet);
    socket.on("keno:online", onOnline);
    return () => {
      socket.off("keno:round", onRound);
      socket.off("keno:bet", onBet);
      socket.off("keno:online", onOnline);
    };
  }, [applyRound]);

  // ---------- phase changes ----------
  const phase = round.phase;
  const focus = phase === "drawing" || phase === "checking";
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (phase === "drawing" && prev !== "drawing") {
      // remember the board as it was when the draw started
      picksAtDraw.current = picksRef.current.slice().sort((a, b) => a - b).join(",");
      setTab("play");
    }
    if (phase === "checking") loadMine(); // results are ready; show wins on the tickets
    if ((prev === "checking" || prev === "drawing") && !focus) {
      // game over: clear the board (unless the player already changed it) and refresh
      setPicks((p) => (p.slice().sort((a, b) => a - b).join(",") === picksAtDraw.current ? [] : p));
      loadMine();
      loadResults();
    }
  }, [phase, focus, loadMine, loadResults]);

  // Players list: the game being drawn, or the game open for tickets.
  const listDrawId = focus ? round.draw?.drawId : round.drawId;
  useEffect(() => {
    if (!listDrawId) return;
    liveDrawId.current = listDrawId;
    setLive({ drawId: listDrawId, players: 0, tickets: 0, list: [] });
    loadPlayers(listDrawId);
  }, [listDrawId, loadPlayers]);

  // ---------- derived ----------
  const serverNow = now + clockOffset;
  const maxPicks = config?.MAX_PICKS ?? 10;
  const minStake = config?.MIN_STAKE ?? 2;
  const maxStake = config?.MAX_STAKE ?? 100;
  const clampStake = (v) => Math.min(maxStake, Math.max(minStake, Math.round(Number(v) || minStake)));
  const safeStake = clampStake(stake);
  const joinMs = config?.JOIN_WINDOW_MS ?? 60000;
  const secondsLeft = round.drawAt ? Math.max(0, Math.ceil((round.drawAt - serverNow) / 1000)) : 0;
  const pickSet = useMemo(() => new Set(picks), [picks]);

  // numbers called so far (worked out from the server's start time)
  const called = useMemo(() => {
    const d = round.draw;
    if (!d) return [];
    if (phase === "checking") return d.numbers;
    const n = Math.min(d.numbers.length, Math.max(0, Math.floor((serverNow - d.startedAt) / d.stepMs) + 1));
    return d.numbers.slice(0, n);
  }, [round.draw, phase, serverNow]);
  const calledSet = useMemo(() => new Set(called), [called]);
  const latest = called[called.length - 1];
  const drawDone = phase === "checking";

  const lastResult = results[0];
  const lastSet = useMemo(() => new Set(lastResult?.numbers || []), [lastResult]);


  const statusText =
    phase === "waiting" ? "Waiting for players"
    : phase === "betting" ? `Starts in ${secondsLeft}s`
    : phase === "drawing" ? `Calling ${called.length} / 20`
    : "Check your tickets";


  // ---------- actions ----------
  const togglePick = (n) => {
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
    if (!picks.length) return toast.info("Pick at least 1 number.");
    if (wallet !== null && wallet < safeStake) return toast.error("Insufficient balance.");
    setPlacing(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/keno/bet`, {
        initData,
        betType: "numbers",
        picks,
        stake: safeStake,
        draws: 1,
      });
      setWallet(data.wallet);
      setTickets((t) => [...[...data.tickets].reverse(), ...t].slice(0, 30));
      // Ticket placed: clear the board so the same numbers aren't bet twice by accident.
      setPicks([]);
      toast.success(phase === "waiting" ? "Ticket placed — game starting!" : "Ticket placed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not place ticket.");
    } finally {
      setPlacing(false);
    }
  };

  // Prize for any ticket against the called numbers (same tables the server uses).
  const prizeOf = (t, numbers) => {
    const type = t.betType || "numbers";
    let mult = 0;
    if (type === "numbers") {
      const set = new Set(numbers);
      mult = paytable[t.picks.length]?.[t.picks.filter((n) => set.has(n)).length] || 0;
    } else {
      const s2 = summarize(numbers);
      const outcome = ["heads", "tails", "ht_evens"].includes(type) ? s2.headsTails : s2.oddEven;
      mult = outcome === type ? sideBets[type]?.multiplier || 0 : 0;
    }
    return Math.min(Math.round(t.stake * mult * 100) / 100, config?.MAX_WIN_PER_TICKET ?? Infinity);
  };

  // One ticket card: masked name, 10 number boxes, bet amount and status.
  // drawn = numbers called so far (null before the draw); done = draw finished.
  const renderTicketCard = ({ t, drawn, done, mine }) => {
    const type = t.betType || "numbers";
    const prize = done && drawn ? prizeOf(t, [...drawn]) : 0;
    // Most this ticket can win (all its numbers hit), within the per-ticket cap.
    const topMult = type === "numbers"
      ? Math.max(0, ...Object.values(paytable[t.picks.length] || {}))
      : sideBets[type]?.multiplier || 0;
    const maxWin = Math.min(Math.round(t.stake * topMult * 100) / 100, config?.MAX_WIN_PER_TICKET ?? Infinity);
    const status = !drawn ? { text: "Waiting", cls: "waiting" }
      : !done ? { text: "Playing", cls: "playing" }
      : prize > 0 ? { text: `Won ${prize}`, cls: "won" }
      : { text: "Lost", cls: "lost" };
    return (
      <div className={`kt-card ${mine ? "mine" : ""} ${done && prize > 0 ? "won" : ""}`}>
        <div className="kt-id">{t.name}{mine ? <span className="kt-you">YOU</span> : null}</div>
        <div className="kt-slots">
          {type === "numbers" ? (
            Array.from({ length: 10 }, (_, i) => {
              const n = t.picks[i];
              if (n === undefined) return <span key={i} className="kt-slot empty" />;
              const hit = drawn && drawn.has(n);
              return <span key={i} className={`kt-slot ${hit ? "hit" : done ? "miss" : "filled"}`}>{n}</span>;
            })
          ) : (
            <span className={`kt-slot wide filled ${done ? (prize > 0 ? "hit" : "miss") : ""}`}>
              {BET_LABEL[type].toUpperCase()} ×{sideBets[type]?.multiplier ?? ""}
            </span>
          )}
        </div>
        <div className="kt-foot">
          <div className="kt-bet">Bet {t.stake}</div>
          <div className={`kt-status ${status.cls}`}>
            <span className="kt-max">Max {maxWin.toLocaleString()}</span>
            <span>{status.text}</span>
          </div>
        </div>
      </div>
    );
  };

  // Ticket list with All / My Tickets / My Bets filters.
  const myIds = new Set(tickets.map((t) => String(t._id)));
  const asCard = (t) => ({ id: String(t._id), name: t.label || maskLabel(t.username || myName), betType: t.betType || "numbers", picks: t.picks || [], stake: t.stake, drawId: t.drawId });
  const myGameTickets = tickets.filter((t) => t.drawId === listDrawId).map(asCard);
  const myBets = tickets.filter((t) => t.drawId >= (listDrawId || 0)).map(asCard);
  const renderTicketBoard = ({ drawn, done }) => {
    // In "All", the player's own tickets come first, then everyone else's.
    const all = [...live.list.filter((t) => myIds.has(t.id)), ...live.list.filter((t) => !myIds.has(t.id))];
    const list = listFilter === "all" ? all : listFilter === "mine" ? myGameTickets : myBets;
    return (
      <section className="kt-board">
        <div className="kt-tabs">
          <button className={listFilter === "all" ? "active" : ""} onClick={() => setListFilter("all")}>All <b>{live.list.length}</b></button>
          <button className={listFilter === "mine" ? "active" : ""} onClick={() => setListFilter("mine")}>My Tickets <b>{myGameTickets.length}</b></button>
          <button className={listFilter === "bets" ? "active" : ""} onClick={() => setListFilter("bets")}>My Bets <b>{myBets.length}</b></button>
        </div>
        {list.length === 0 && <p className="kn-muted kn-pad">No tickets yet.</p>}
        {list.map((t) => (
          <React.Fragment key={t.id}>
            {renderTicketCard({
              t,
              mine: myIds.has(t.id),
              drawn: t.drawId === listDrawId ? drawn : null,
              done: t.drawId === listDrawId ? done : false,
            })}
          </React.Fragment>
        ))}
      </section>
    );
  };

  // ---------- render ----------
  return (
    <div className="keno">
      <div className="keno-inner">
        <div className="kn-head">
          <div>
            <div className="kn-logo" aria-label="Fast Keno">
              <span className="kn-logo-fast">FAST</span>
              <span className="kn-logo-keno">KENO<i /></span>
            </div>
            <div className="kn-sub">
              Game #{(focus ? round.draw?.drawId : round.drawId) ?? "—"}
              {phase !== "betting" && <> · <span className={`kn-status ${phase}`}>{statusText}</span></>}
            </div>
          </div>
          <div className={`kn-timer ${phase} ${phase === "betting" && secondsLeft <= 10 ? "low" : ""}`}>
            {phase === "betting" ? `00:${pad2(secondsLeft)}` : "00:00"}
          </div>
          <div className="kn-wallet">{wallet === null ? "—" : wallet.toFixed(2)} ETB</div>
        </div>

        {/* ================= FOCUS VIEW: draw in progress ================= */}
        {focus ? (
          <>
            <section className={`kd-stage ${phase}`}>
              <div className="kd-rings"><i /><i /><i /><i /></div>
              <div className="kd-count">{pad2(called.length)}<em>/</em>20</div>
              <div className="kd-center">
                {phase === "drawing" && latest !== undefined && <div key={latest} className="kd-big">{latest}</div>}
              </div>
              <div className="kd-grid">
                {Array.from({ length: 20 }, (_, i) => {
                  const n = called[i];
                  return n === undefined ? (
                    <span key={`e${i}`} className="kd-ball empty" />
                  ) : (
                    <span key={n} className="kd-ball">{n}</span>
                  );
                })}
              </div>
            </section>

            {renderTicketBoard({ drawn: calledSet, done: drawDone })}
          </>
        ) : (
          /* ================= NORMAL VIEW ================= */
          <>
            <div className="kn-stats">
              <div><span>PLAYERS</span><strong>{live.players}</strong></div>
              <div><span>TICKETS</span><strong>{live.tickets}</strong></div>
              <div><span>MY OPEN</span><strong>{tickets.filter((t) => t.status === "pending").length}</strong></div>
            </div>

            <div className="kn-tabs">
              {TABS.map((t) => (
                <button key={t.id} className={`kn-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "play" && (
              <>

                <section className="kn-grid">
                    {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        className={`kn-cell ${pickSet.has(n) ? "picked" : ""} ${lastSet.has(n) ? "last" : ""}`}
                        onClick={() => togglePick(n)}
                      >
                        {n}
                      </button>
                    ))}
                </section>

                <section className="kn-card">
                  <div className="kn-card-head">
                    <span>My selection</span>
                    <span className="kn-row-btns">
                      <button className="kn-ghost" onClick={quickPick}>🎲 Auto</button>
                      <button className="kn-ghost" onClick={() => setPicks([])}>Reset</button>
                    </span>
                  </div>
                  {picks.length ? (
                    <>
                      <PickChips nums={[...picks].sort((a, b) => a - b)} />
                      <div className="kn-muted kn-mt6">{picks.length}/{maxPicks} picked</div>
                    </>
                  ) : (
                    <p className="kn-muted kn-mt0">Tap numbers on the board, or press Auto.</p>
                  )}

                  <div className="kn-label">Stake per game (ETB)</div>
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

                  <button className="kn-bet" disabled={placing || !picks.length} onClick={placeBet}>
                    {placing ? "Placing…" : `Bet ${safeStake} ETB`}
                  </button>

                </section>

                {renderTicketBoard({ drawn: null, done: false })}

                <p className="kn-fine">
                  20 of 80 numbers are drawn at random, one per second. Prizes come from fixed tables, so everyone has the
                  same chance. On average the game pays back about 60% of stakes.
                  {config ? ` Max win per ticket: ${config.MAX_WIN_PER_TICKET.toLocaleString()} ETB.` : ""}
                </p>
              </>
            )}

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
                      <div className="kn-avatar small">#{String(t.drawId).slice(-3)}<Badge type={type} /></div>
                      <div className="kn-row-main">
                        <div className="kn-row-name">Game #{t.drawId} · {BET_LABEL[type]}</div>
                        {type === "numbers" ? <PickChips nums={t.picks} drawn={drawn} done={!!drawn} /> : null}
                        <div className="kn-muted">
                          Stake {t.stake} ETB{t.groupSize > 1 ? ` · ${t.groupSize}-game ticket` : ""} · {timeOf(t.createdAt)}
                        </div>
                      </div>
                      <div className="kn-row-right">
                        {t.status === "pending" && <span className="kn-muted">⏳ Waiting</span>}
                        {t.status === "won" && <span className="kn-green kn-big">+{t.payout}</span>}
                        {t.status === "lost" && <span className="kn-muted">{type === "numbers" ? `${t.matches} hit${t.matches === 1 ? "" : "s"}` : "Lost"}</span>}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {tab === "results" && (
              <section className="kn-list">
                <div className="kn-list-head">
                  <span>Game results</span>
                  <span className="kn-muted">last {results.length}</span>
                </div>
                {results.length === 0 && <p className="kn-muted kn-pad">No games yet.</p>}
                {results.map((d) => {
                  const s = summarize(d.numbers);
                  return (
                    <div key={d.drawId} className="kn-result">
                      <div className="kn-result-head">
                        <span className="kn-row-name">Game #{d.drawId}</span>
                        <span className="kn-muted">{d.drawAt ? timeOf(d.drawAt) : ""}</span>
                      </div>
                      <div className="kn-result-balls">
                        {d.numbers.map((n) => <span key={n} className={`kn-mini ${n > 40 ? "tail" : ""}`}>{n}</span>)}
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
          </>
        )}
      </div>
    </div>
  );
};

export default FastKeno;
