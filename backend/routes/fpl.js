// routes/fpl.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fpl = require('fpl-api');

const secretkey = process.env.JWT_SECRET;

// --- Simple in-memory cache for bootstrap data ---
let bootstrapCache = null;
let bootstrapCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getBootstrap() {
  const now = Date.now();
  if (bootstrapCache && now - bootstrapCacheTime < CACHE_TTL) {
    return bootstrapCache;
  }
  bootstrapCache = await fpl.fetchBootstrap();
  bootstrapCacheTime = now;
  return bootstrapCache;
}

// --- Auth middleware (reuse your JWT style) ---
const verifyUser = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  jwt.verify(token, secretkey, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.username = decoded.username;
    req.role = decoded.role;
    next();
  });
};

// --- 1. Get a user's FPL team info ---
// GET /api/fpl/team/:teamId
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const data = await fpl.fetchEntry(teamId);
    res.json(data);
  } catch (err) {
    console.error('FPL team fetch error:', err.message);
    res.status(500).json({ error: 'FPL API unavailable' });
  }
});

// --- 2. Get a user's picks for a specific gameweek ---
// GET /api/fpl/picks/:teamId/:gw
router.get('/picks/:teamId/:gw', async (req, res) => {
  try {
    const { teamId, gw } = req.params;
    // NOTE: If this throws "fetchEntryEvent is not a function",
    // change to fpl.fetchEntryPicks(teamId, Number(gw))
    const data = await fpl.fetchEntryEvent(teamId, Number(gw));
    res.json(data);
  } catch (err) {
    console.error('FPL picks fetch error:', err.message);
    res.status(500).json({ error: 'FPL API unavailable' });
  }
});

// --- 3. Get classic league standings ---
// GET /api/fpl/league/:leagueId
router.get('/league/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const data = await fpl.fetchClassicLeague(leagueId);
    res.json(data);
  } catch (err) {
    console.error('FPL league fetch error:', err.message);
    res.status(500).json({ error: 'FPL API unavailable' });
  }
});

// --- 4. Player search (uses cached bootstrap) ---
// GET /api/fpl/player?name=salah
router.get('/player', async (req, res) => {
  try {
    const q = (req.query.name || '').toLowerCase();
    if (!q) return res.status(400).json({ error: 'name query required' });

    const bootstrap = await getBootstrap();
    const results = bootstrap.elements
      .filter(p => (p.web_name || '').toLowerCase().includes(q) ||
                   (p.first_name + ' ' + p.second_name).toLowerCase().includes(q))
      .slice(0, 20)
      .map(p => ({
        id: p.id,
        name: p.web_name,
        team: p.team,
        price: p.now_cost / 10,
        total_points: p.total_points,
        form: p.form,
        selected_by: p.selected_by_percent
      }));

    res.json(results);
  } catch (err) {
    console.error('FPL player search error:', err.message);
    res.status(500).json({ error: 'FPL API unavailable' });
  }
});

// --- 5. Bind FPL team ID to a Telegram user ---
// POST /api/fpl/bind  { teamId, telegramId }
router.post('/bind', async (req, res) => {
  try {
    const { teamId, telegramId } = req.body;
    if (!teamId || !telegramId) return res.status(400).json({ error: 'teamId and telegramId required' });

    const entry = await fpl.fetchEntry(teamId);

    const BingoBord = require('../Models/BingoBord');
    await BingoBord.updateOne(
      { telegramId: Number(telegramId) },
      { $set: { fplTeamId: Number(teamId), fplTeamName: entry.name } }
    );

    res.json({ success: true, teamName: entry.name });
  } catch (err) {
    console.error('FPL bind error:', err.message);
    res.status(500).json({ error: 'Could not bind team' });
  }
});

// --- 6. Get my FPL team (by telegramId) ---
// GET /api/fpl/myteam?telegramId=XXX
router.get('/myteam', async (req, res) => {
  try {
    const { telegramId } = req.query;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });

    const BingoBord = require('../Models/BingoBord');
    const user = await BingoBord.findOne({ telegramId: Number(telegramId) });
    if (!user || !user.fplTeamId) {
      return res.status(404).json({ error: 'No FPL team bound' });
    }

    const entry = await fpl.fetchEntry(user.fplTeamId);
    res.json({
      teamId: user.fplTeamId,
      name: entry.name,
      overallPoints: entry.summary_overall_points,
      overallRank: entry.summary_overall_rank,
      currentGwPoints: entry.summary_event_points
    });
  } catch (err) {
    console.error('FPL myteam error:', err.message);
    res.status(500).json({ error: 'FPL API unavailable' });
  }
});

// --- 7. Full bootstrap data (cached) ---
// GET /api/fpl/bootstrap
// --- 7. Full bootstrap data (cached & formatted) ---
// GET /api/fpl/bootstrap
router.get('/bootstrap', async (req, res) => {
  try {
    

   
    const rawData = await getBootstrap();
     console.log("Total FPL players:", rawData.elements.length);
    // Create a map of Team IDs to Team Names (e.g., 1 -> "Arsenal")
    const teamMap = {};
    rawData.teams.forEach(t => { teamMap[t.id] = t.name; });

    // Format players for the frontend
    const players = rawData.elements.map(p => ({
      id: p.id,
      name: p.web_name,
      team: teamMap[p.team], // e.g., "Brighton"
      teamCode: p.team,
      position: p.element_type, // 1=GK, 2=DEF, 3=MID, 4=FWD
      price: p.now_cost / 10, // e.g., 4.6
      totalPoints: p.total_points,
      photo: `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png` // Real FPL Photos!
    }));

    res.json({
      currentGw: rawData.events.find(e => e.is_current)?.id || 1,
      players
    });
  } catch (err) {
    console.error('FPL bootstrap error:', err.message);
    res.status(500).json({ error: 'FPL API unavailable' });
  }
});
// --- 8. Save User's FPL Squad ---
// POST /api/fpl/save-squad { telegramId, squadIds }
// --- 8. Save User's FPL Squad & Captain ---
// POST /api/fpl/save-squad { telegramId, squadIds, captainId }
router.post('/save-squad', async (req, res) => {
  try {
    const { telegramId, squadIds, captainId } = req.body;
    if (!telegramId || !squadIds || !Array.isArray(squadIds)) {
      return res.status(400).json({ error: 'telegramId and squadIds array required' });
    }

    const BingoBord = require('../Models/BingoBord');
    
    // Save the array of 15 player IDs and the captain ID
    await BingoBord.updateOne(
      { telegramId: Number(telegramId) },
      { 
        $set: { 
          fplSquad: squadIds,
          fplCaptainId: captainId || null // Save captain (or null if none)
        } 
      }
    );

    res.json({ success: true, message: 'Squad and Captain saved successfully' });
  } catch (err) {
    console.error('FPL save squad error:', err.message);
    res.status(500).json({ error: 'Could not save squad' });
  }
});
module.exports = router;