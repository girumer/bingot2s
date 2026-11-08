// =========================================================================
// FAST KENO
//
// Bet types
//   numbers  – pick 1–10 numbers from 1–80, paid from PAYTABLE
//   heads    – more of the 20 drawn numbers are in 1–40      (×2)
//   tails    – more of the 20 drawn numbers are in 41–80     (×2)
//   ht_evens – exactly 10 / 10 split between 1–40 and 41–80 (×3.9)
//   odd      – more odd numbers drawn                        (×2)
//   even     – more even numbers drawn                       (×2)
//   oe_evens – exactly 10 odd / 10 even                      (×3.9)
//
// Every 60 seconds the server draws 20 numbers with a secure shuffle.
// Results depend only on the draw: no bots, nothing depends on who plays.
// Every paytable row pays back about 79–80% on average (exact odds checked);
// the rest is the house cut.
//
// Every wallet change made by keno is written to the WalletLedger
// collection, and every draw's totals are written to KenoDrawReport.
// =========================================================================

const crypto = require("crypto");
const mongoose = require("mongoose");

// ---------------- SETTINGS (change these, not the code below) ----------------
const KENO_CONFIG = {
  DRAW_INTERVAL_MS: 60 * 1000, // a new draw every 60 seconds
  BET_CLOSE_MS: 5 * 1000,      // betting closes 5 seconds before each draw
  TOTAL_NUMBERS: 80,
  DRAWN_NUMBERS: 20,
  MIN_PICKS: 1,
  MAX_PICKS: 10,
  MIN_STAKE: 2,
  MAX_STAKE: 100,
  MAX_WIN_PER_TICKET: 10000,     // cap on one ticket's payout (birr)
  MAX_TICKETS_PER_DRAW: 10,      // per player, per draw
  MULTI_DRAW_OPTIONS: [1, 5, 10],// how many consecutive draws one ticket can play
};

// PAYTABLE[picks][matches] = stake multiplier (numbers bets)
const PAYTABLE = {
  1: { 1: 3.2 },
  2: { 2: 13 },
  3: { 2: 2.8, 3: 30 },
  4: { 2: 1.6, 3: 7, 4: 50 },
  5: { 3: 3.5, 4: 22, 5: 380 },
  6: { 3: 1.5, 4: 8, 5: 65, 6: 1300 },
  7: { 3: 1.3, 4: 3, 5: 20, 6: 200, 7: 3500 },
  8: { 4: 2.5, 5: 14, 6: 80, 7: 700, 8: 7000 },
  9: { 4: 1.2, 5: 6, 6: 40, 7: 250, 8: 2500, 9: 12500 },
  10: { 0: 3, 5: 2.5, 6: 20, 7: 110, 8: 700, 9: 3500, 10: 14000 },
};

// Side bets: P(10/10 split) = 20.3%, P(one side wins) = 39.8% each
const SIDE_BETS = {
  heads:    { label: "Heads (1–40)",  multiplier: 2 },
  tails:    { label: "Tails (41–80)", multiplier: 2 },
  ht_evens: { label: "Heads/Tails Evens (10–10)", multiplier: 3.9 },
  odd:      { label: "Odd",  multiplier: 2 },
  even:     { label: "Even", multiplier: 2 },
  oe_evens: { label: "Odd/Even Evens (10–10)", multiplier: 3.9 },
};
const BET_TYPES = ["numbers", ...Object.keys(SIDE_BETS)];

// ---------------- MODELS ----------------
const KenoDrawSchema = new mongoose.Schema({
  drawId: { type: Number, required: true, unique: true },
  drawAt: { type: Date, required: true },
  numbers: { type: [Number], required: true },
  headsCount: { type: Number }, // numbers drawn in 1–40
  oddCount: { type: Number },   // odd numbers drawn
  createdAt: { type: Date, default: Date.now },
});

const KenoTicketSchema = new mongoose.Schema({
  drawId: { type: Number, required: true, index: true },
  telegramId: { type: Number, required: true, index: true },
  username: { type: String },
  betType: { type: String, enum: BET_TYPES, default: "numbers" },
  picks: { type: [Number], default: [] },
  stake: { type: Number, required: true },
  groupId: { type: String, index: true }, // shared by tickets of one multi-draw purchase
  groupSize: { type: Number, default: 1 },
  matches: { type: Number, default: null },
  multiplier: { type: Number, default: 0 },
  payout: { type: Number, default: 0 },
  status: { type: String, enum: ["pending", "won", "lost"], default: "pending", index: true },
  createdAt: { type: Date, default: Date.now },
});
KenoTicketSchema.index({ drawId: 1, status: 1 });
KenoTicketSchema.index({ telegramId: 1, createdAt: -1 });

// One row per wallet movement made by keno. Balance history can be rebuilt
// from this table and every dispute traced to a ticket.
const WalletLedgerSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, index: true },
  game: { type: String, default: "keno" },
  type: { type: String, enum: ["bet", "win", "refund"], required: true },
  amount: { type: Number, required: true }, // negative = money out of the wallet
  balanceAfter: { type: Number },
  refId: { type: String },                  // ticket groupId or ticket _id
  drawId: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

// Totals per draw, for the admin report.
const KenoDrawReportSchema = new mongoose.Schema({
  drawId: { type: Number, required: true, unique: true },
  drawAt: { type: Date, required: true },
  tickets: { type: Number, default: 0 },
  staked: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  winners: { type: Number, default: 0 },
  byType: { type: Object, default: {} }, // { heads: { staked, paid, tickets }, ... }
});

const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);
const KenoDraw = model("KenoDraw", KenoDrawSchema);
const KenoTicket = model("KenoTicket", KenoTicketSchema);
const WalletLedger = model("WalletLedger", WalletLedgerSchema);
const KenoDrawReport = model("KenoDrawReport", KenoDrawReportSchema);

// ---------------- HELPERS ----------------
// Draw times are fixed to the clock, so every server process agrees on
// which draw is open without sharing memory.
const drawIdAt = (time) => Math.floor(time / KENO_CONFIG.DRAW_INTERVAL_MS) + 1;
const drawTimeOf = (drawId) => drawId * KENO_CONFIG.DRAW_INTERVAL_MS;
function openDrawId(now = Date.now()) {
  let id = drawIdAt(now);
  if (drawTimeOf(id) - now < KENO_CONFIG.BET_CLOSE_MS) id += 1;
  return id;
}

// Cryptographically secure draw: shuffle 1–80, take the first 20.
function generateDrawNumbers() {
  const pool = Array.from({ length: KENO_CONFIG.TOTAL_NUMBERS }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, KENO_CONFIG.DRAWN_NUMBERS).sort((a, b) => a - b);
}

function drawSummary(numbers) {
  const headsCount = numbers.filter((n) => n <= KENO_CONFIG.TOTAL_NUMBERS / 2).length;
  const oddCount = numbers.filter((n) => n % 2 === 1).length;
  const half = KENO_CONFIG.DRAWN_NUMBERS / 2;
  return {
    headsCount,
    oddCount,
    headsTails: headsCount > half ? "heads" : headsCount < half ? "tails" : "ht_evens",
    oddEven: oddCount > half ? "odd" : oddCount < half ? "even" : "oe_evens",
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

// Name shown to other players. Phone-number usernames are partly hidden.
function displayName(username) {
  const name = String(username || "Player").trim();
  const digits = name.replace(/\D/g, "");
  if (digits.length >= 7 && digits.length >= name.replace(/[\s+\-()]/g, "").length - 1) {
    return `${name.slice(0, 4)}****${name.slice(-2)}`;
  }
  return name.length > 18 ? `${name.slice(0, 17)}…` : name;
}

// Score one ticket against a draw.
function scoreTicket(ticket, drawn) {
  const { betType = "numbers", picks = [], stake } = ticket;
  let matches;
  let multiplier = 0;

  if (betType === "numbers") {
    const drawnSet = new Set(drawn);
    matches = picks.filter((n) => drawnSet.has(n)).length;
    multiplier = PAYTABLE[picks.length]?.[matches] || 0;
  } else {
    const s = drawSummary(drawn);
    const isHT = ["heads", "tails", "ht_evens"].includes(betType);
    matches = isHT ? s.headsCount : s.oddCount; // stored for display
    const outcome = isHT ? s.headsTails : s.oddEven;
    multiplier = outcome === betType ? SIDE_BETS[betType].multiplier : 0;
  }

  const payout = Math.min(round2(stake * multiplier), KENO_CONFIG.MAX_WIN_PER_TICKET);
  return { matches, multiplier, payout };
}

function validatePicks(picks) {
  if (!Array.isArray(picks)) return "Picks must be a list of numbers.";
  if (picks.length < KENO_CONFIG.MIN_PICKS || picks.length > KENO_CONFIG.MAX_PICKS) {
    return `Pick between ${KENO_CONFIG.MIN_PICKS} and ${KENO_CONFIG.MAX_PICKS} numbers.`;
  }
  const seen = new Set();
  for (const n of picks) {
    if (!Number.isInteger(n) || n < 1 || n > KENO_CONFIG.TOTAL_NUMBERS) {
      return `Numbers must be between 1 and ${KENO_CONFIG.TOTAL_NUMBERS}.`;
    }
    if (seen.has(n)) return "Each number can only be picked once.";
    seen.add(n);
  }
  return null;
}

// Validate a bet request. Returns { error } or { bet }.
function parseBet(body) {
  const betType = body.betType || "numbers";
  if (!BET_TYPES.includes(betType)) return { error: "Unknown bet type." };

  const stake = Number(body.stake);
  if (!Number.isInteger(stake) || stake < KENO_CONFIG.MIN_STAKE || stake > KENO_CONFIG.MAX_STAKE) {
    return { error: `Stake must be a whole number between ${KENO_CONFIG.MIN_STAKE} and ${KENO_CONFIG.MAX_STAKE}.` };
  }

  const draws = Number(body.draws || 1);
  if (!KENO_CONFIG.MULTI_DRAW_OPTIONS.includes(draws)) {
    return { error: `Number of draws must be one of ${KENO_CONFIG.MULTI_DRAW_OPTIONS.join(", ")}.` };
  }

  let picks = [];
  if (betType === "numbers") {
    picks = (body.picks || []).map(Number);
    const err = validatePicks(picks);
    if (err) return { error: err };
    picks.sort((a, b) => a - b);
  }
  return { bet: { betType, stake, draws, picks } };
}

// ---------------- SETUP ----------------
function setupKeno({ app, io, BingoBord, verifyTelegramInitData, verifyAdmin }) {
  function authUser(initData) {
    if (!initData) return null;
    const verified = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
    if (!verified) return null;
    try {
      return JSON.parse(verified.user);
    } catch {
      return null;
    }
  }

  async function ledger(entry) {
    try {
      await WalletLedger.create(entry);
    } catch (err) {
      console.error("[KENO] ledger write failed:", err.message, entry);
    }
  }

  // Public view of a ticket for the live players list (no Telegram ids).
  const publicTicket = (t) => ({
    id: String(t._id),
    drawId: t.drawId,
    name: displayName(t.username),
    betType: t.betType || "numbers",
    picks: t.picks || [],
    stake: t.stake,
    createdAt: t.createdAt,
  });

  // ---- Live presence: who has the keno page open ----
  io.on("connection", (socket) => {
    socket.on("keno:join", () => {
      socket.join("keno");
      socket.emit("keno:online", { online: onlineCount() });
    });
    socket.on("keno:leave", () => socket.leave("keno"));
  });
  function onlineCount() {
    return io.sockets?.adapter?.rooms?.get("keno")?.size || 0;
  }

  // ---- Players and tickets in one draw (for the live list) ----
  app.get("/api/keno/players", async (req, res) => {
    try {
      const drawId = Number(req.query.drawId) || openDrawId();
      const tickets = await KenoTicket.find({ drawId }).sort({ createdAt: -1 }).limit(200).lean();
      const players = new Set(tickets.map((t) => t.telegramId)).size;
      res.json({
        drawId,
        players,
        tickets: tickets.length,
        online: onlineCount(),
        list: tickets.map(publicTicket),
      });
    } catch (err) {
      console.error("[KENO] players error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ---- Past results (Results tab) ----
  app.get("/api/keno/results", async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
      const draws = await KenoDraw.find({}, { _id: 0, drawId: 1, drawAt: 1, numbers: 1 })
        .sort({ drawId: -1 })
        .limit(limit)
        .lean();
      res.json({ draws: draws.map((d) => ({ ...d, ...drawSummary(d.numbers) })) });
    } catch (err) {
      console.error("[KENO] results error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ---- Public state: next draw, recent results, paytables ----
  app.get("/api/keno/state", async (req, res) => {
    try {
      const now = Date.now();
      const nextDrawId = openDrawId(now);
      const recent = await KenoDraw.find({}, { _id: 0, drawId: 1, drawAt: 1, numbers: 1, headsCount: 1, oddCount: 1 })
        .sort({ drawId: -1 })
        .limit(10)
        .lean();
      res.json({
        serverNow: now,
        nextDrawId,
        nextDrawAt: drawTimeOf(nextDrawId),
        betCloseAt: drawTimeOf(nextDrawId) - KENO_CONFIG.BET_CLOSE_MS,
        recentDraws: recent.map((d) => ({ ...d, ...drawSummary(d.numbers) })),
        config: KENO_CONFIG,
        paytable: PAYTABLE,
        sideBets: SIDE_BETS,
      });
    } catch (err) {
      console.error("[KENO] state error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ---- Hot / cold numbers and heads/tails history (for TV display) ----
  app.get("/api/keno/stats", async (req, res) => {
    try {
      const last = await KenoDraw.find({}, { _id: 0, drawId: 1, numbers: 1 })
        .sort({ drawId: -1 })
        .limit(100)
        .lean();
      const freq = Array(KENO_CONFIG.TOTAL_NUMBERS + 1).fill(0);
      const outcomes = { heads: 0, tails: 0, ht_evens: 0, odd: 0, even: 0, oe_evens: 0 };
      for (const d of last) {
        d.numbers.forEach((n) => (freq[n] += 1));
        const s = drawSummary(d.numbers);
        outcomes[s.headsTails] += 1;
        outcomes[s.oddEven] += 1;
      }
      const ranked = freq
        .map((count, n) => ({ n, count }))
        .slice(1)
        .sort((a, b) => b.count - a.count || a.n - b.n);
      res.json({
        draws: last.length,
        hot: ranked.slice(0, 10),
        cold: ranked.slice(-10).reverse(),
        outcomes,
      });
    } catch (err) {
      console.error("[KENO] stats error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ---- Place a bet (one ticket per draw; multi-draw creates several) ----
  app.post("/api/keno/bet", async (req, res) => {
    const user = authUser(req.body.initData);
    if (!user) return res.status(401).json({ error: "Invalid authentication" });

    const { error, bet } = parseBet(req.body);
    if (error) return res.status(400).json({ error });

    const firstDrawId = openDrawId();
    const drawIds = Array.from({ length: bet.draws }, (_, i) => firstDrawId + i);
    const total = bet.stake * bet.draws;

    try {
      const existing = await KenoTicket.countDocuments({ drawId: firstDrawId, telegramId: user.id });
      if (existing >= KENO_CONFIG.MAX_TICKETS_PER_DRAW) {
        return res.status(400).json({ error: `Maximum ${KENO_CONFIG.MAX_TICKETS_PER_DRAW} tickets per draw.` });
      }

      // Atomic: only deducts if the balance covers every draw.
      const player = await BingoBord.findOneAndUpdate(
        { telegramId: user.id, Wallet: { $gte: total } },
        { $inc: { Wallet: -total } },
        { new: true }
      );
      if (!player) {
        const exists = await BingoBord.exists({ telegramId: user.id });
        return res.status(exists ? 400 : 404).json({ error: exists ? "Insufficient balance" : "User not found" });
      }

      const groupId = crypto.randomUUID();
      await ledger({
        telegramId: user.id, type: "bet", amount: -total,
        balanceAfter: round2(player.Wallet), refId: groupId, drawId: firstDrawId,
      });

      let tickets;
      try {
        tickets = await Promise.all(
          drawIds.map((drawId) =>
            KenoTicket.create({
              drawId,
              telegramId: user.id,
              username: player.username,
              betType: bet.betType,
              picks: bet.picks,
              stake: bet.stake,
              groupId,
              groupSize: bet.draws,
            })
          )
        );
      } catch (err) {
        // Something failed — remove any saved tickets and refund everything.
        await KenoTicket.deleteMany({ groupId });
        const refunded = await BingoBord.findOneAndUpdate(
          { telegramId: user.id }, { $inc: { Wallet: total } }, { new: true }
        );
        await ledger({
          telegramId: user.id, type: "refund", amount: total,
          balanceAfter: refunded ? round2(refunded.Wallet) : undefined, refId: groupId,
        });
        throw err;
      }

      res.json({
        tickets,
        wallet: round2(player.Wallet),
        firstDrawAt: drawTimeOf(firstDrawId),
      });

      // Tell everyone on the keno page about the new ticket(s).
      io.emit("keno:bet", { tickets: tickets.map(publicTicket) });
    } catch (err) {
      console.error("[KENO] bet error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ---- A player's recent tickets + wallet ----
  app.post("/api/keno/my-tickets", async (req, res) => {
    const user = authUser(req.body.initData);
    if (!user) return res.status(401).json({ error: "Invalid authentication" });
    try {
      const [player, tickets] = await Promise.all([
        BingoBord.findOne({ telegramId: user.id }, { Wallet: 1 }).lean(),
        KenoTicket.find({ telegramId: user.id }).sort({ createdAt: -1 }).limit(30).lean(),
      ]);
      if (!player) return res.status(404).json({ error: "User not found" });
      res.json({ wallet: round2(player.Wallet), tickets });
    } catch (err) {
      console.error("[KENO] my-tickets error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ---- Admin report ----
  const adminOnly = verifyAdmin || ((req, res) => res.status(403).json({ error: "Admin check not configured" }));
  app.get("/api/keno/admin/report", adminOnly, async (req, res) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const reports = await KenoDrawReport.find({ drawAt: { $gte: since } }).sort({ drawId: -1 }).lean();

      const byDay = {};
      const byType = {};
      const totals = { draws: 0, tickets: 0, staked: 0, paid: 0, winners: 0 };
      for (const r of reports) {
        // Group by Addis Ababa calendar day (UTC+3)
        const day = new Date(new Date(r.drawAt).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
        byDay[day] = byDay[day] || { day, draws: 0, tickets: 0, staked: 0, paid: 0, winners: 0 };
        for (const t of [byDay[day], totals]) {
          t.draws += 1;
          t.tickets += r.tickets;
          t.staked += r.staked;
          t.paid += r.paid;
          t.winners += r.winners;
        }
        for (const [type, v] of Object.entries(r.byType || {})) {
          byType[type] = byType[type] || { type, tickets: 0, staked: 0, paid: 0 };
          byType[type].tickets += v.tickets;
          byType[type].staked += v.staked;
          byType[type].paid += v.paid;
        }
      }
      const finish = (t) => ({
        ...t,
        staked: round2(t.staked),
        paid: round2(t.paid),
        profit: round2(t.staked - t.paid),
        payback: t.staked ? round2((t.paid / t.staked) * 100) : null,
      });

      const pending = await KenoTicket.find({ status: "pending" }, { stake: 1 }).lean();
      res.json({
        days,
        totals: finish(totals),
        byDay: Object.values(byDay).sort((a, b) => b.day.localeCompare(a.day)).map(finish),
        byType: Object.values(byType).map(finish),
        recentDraws: reports.slice(0, 30).map(finish),
        pendingTickets: pending.length,
        pendingStake: round2(pending.reduce((s, t) => s + t.stake, 0)),
        config: KENO_CONFIG,
        paytable: PAYTABLE,
        sideBets: SIDE_BETS,
      });
    } catch (err) {
      console.error("[KENO] report error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ---- Draw + settle (only one process runs this) ----
  async function getOrCreateDraw(drawId) {
    const numbers = generateDrawNumbers();
    const { headsCount, oddCount } = drawSummary(numbers);
    try {
      await KenoDraw.create({ drawId, drawAt: new Date(drawTimeOf(drawId)), numbers, headsCount, oddCount });
    } catch (err) {
      if (err.code !== 11000) throw err; // 11000 = already drawn, use the saved one
    }
    return KenoDraw.findOne({ drawId }).lean();
  }

  async function settleDraw(draw) {
    const tickets = await KenoTicket.find({ drawId: draw.drawId, status: "pending" }).lean();
    const sum = { tickets: 0, staked: 0, paid: 0, winners: 0 };
    const inc = {};

    for (const t of tickets) {
      const { matches, multiplier, payout } = scoreTicket(t, draw.numbers);
      // Only the call that flips the ticket from "pending" pays it, so a
      // ticket can never be paid twice.
      const updated = await KenoTicket.findOneAndUpdate(
        { _id: t._id, status: "pending" },
        { $set: { matches, multiplier, payout, status: payout > 0 ? "won" : "lost" } }
      );
      if (!updated) continue;

      sum.tickets += 1;
      sum.staked += t.stake;
      const type = t.betType || "numbers";
      inc[`byType.${type}.tickets`] = (inc[`byType.${type}.tickets`] || 0) + 1;
      inc[`byType.${type}.staked`] = (inc[`byType.${type}.staked`] || 0) + t.stake;

      if (payout > 0) {
        const player = await BingoBord.findOneAndUpdate(
          { telegramId: t.telegramId }, { $inc: { Wallet: payout } }, { new: true }
        );
        await ledger({
          telegramId: t.telegramId, type: "win", amount: payout,
          balanceAfter: player ? round2(player.Wallet) : undefined,
          refId: String(t._id), drawId: draw.drawId,
        });
        sum.paid += payout;
        sum.winners += 1;
        inc[`byType.${type}.paid`] = (inc[`byType.${type}.paid`] || 0) + payout;
      }
    }

    if (sum.tickets) {
      await KenoDrawReport.updateOne(
        { drawId: draw.drawId },
        {
          $setOnInsert: { drawAt: new Date(drawTimeOf(draw.drawId)) },
          $inc: { tickets: sum.tickets, staked: sum.staked, paid: round2(sum.paid), winners: sum.winners, ...inc },
        },
        { upsert: true }
      );
      console.log(`[KENO] Draw ${draw.drawId}: ${sum.tickets} tickets, staked ${sum.staked}, paid ${round2(sum.paid)}`);
    }
  }

  let running = false;
  let lastSettledDrawId = 0;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const dueDrawId = drawIdAt(Date.now()) - 1; // newest draw whose time has passed
      if (dueDrawId > lastSettledDrawId) {
        // Settle anything missed (server restart, late tickets).
        const pendingIds = await KenoTicket.distinct("drawId", { status: "pending", drawId: { $lt: dueDrawId } });
        for (const id of pendingIds.sort((a, b) => a - b)) {
          await settleDraw(await getOrCreateDraw(id));
        }

        const draw = await getOrCreateDraw(dueDrawId);
        await settleDraw(draw);
        lastSettledDrawId = dueDrawId;

        const nextDrawId = openDrawId(Date.now());
        io.emit("keno:draw", {
          drawId: draw.drawId,
          numbers: draw.numbers,
          ...drawSummary(draw.numbers),
          nextDrawId,
          nextDrawAt: drawTimeOf(nextDrawId),
          serverNow: Date.now(),
        });
      }
    } catch (err) {
      console.error("[KENO] draw error:", err);
    } finally {
      running = false;
    }
  }

  const isLeader = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === "0";
  if (isLeader) {
    lastSettledDrawId = drawIdAt(Date.now()) - 2;
    setInterval(tick, 1000);
    // Online count for everyone with the keno page open, every 5 seconds.
    setInterval(() => io.to("keno").emit("keno:online", { online: onlineCount() }), 5000);
    console.log("[KENO] Draw loop started.");
  }
}

module.exports = {
  setupKeno,
  KENO_CONFIG,
  PAYTABLE,
  SIDE_BETS,
  scoreTicket,
  generateDrawNumbers,
  validatePicks,
  parseBet,
  drawSummary,
};
