// components/FplDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

export default function FplDashboard() {
  const [auth, setAuth] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [team, setTeam] = useState(null);
  const [leagueId, setLeagueId] = useState('');
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myTeam, setMyTeam] = useState(null);

  // --- 1. Authenticate with Telegram initData ---
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setAuth({ error: 'Open this page from the Telegram bot.' });
      return;
    }

    axios.post(`${API_BASE}/api/verify-init-data`, { initData })
      .then(res => setAuth({ user: res.data.user }))
      .catch(() => setAuth({ error: 'Authentication failed' }));
  }, []);

  // --- 2. Load my bound team (if any) ---
  useEffect(() => {
    if (!auth?.user) return;
    // We need a JWT for the /myteam endpoint. But in Telegram WebApp context
    // we don't have a JWT — so use a public fetch with telegramId instead.
    // See Step 5 (backend tweak) below.
    axios.get(`${API_BASE}/api/fpl/myteam?telegramId=${auth.user.telegramId}`)
      .then(res => {
        if (res.data && res.data.teamId) setMyTeam(res.data);
      })
      .catch(() => {}); // 404 = no team bound yet, that's fine
  }, [auth]);

  // --- 3. Public: load any team by ID ---
  const loadTeam = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/fpl/team/${teamId}`);
      setTeam(res.data);
    } catch (e) {
      setTeam({ error: 'Failed to load team' });
    }
    setLoading(false);
  };

  // --- 4. Public: load league standings ---
  const loadLeague = async () => {
    if (!leagueId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/fpl/league/${leagueId}`);
      setLeague(res.data);
    } catch (e) {
      setLeague({ error: 'Failed to load league' });
    }
    setLoading(false);
  };

  // --- 5. Bind this Telegram user to an FPL team ---
  const bindTeam = async () => {
    if (!teamId || !auth?.user) return;
    try {
      await axios.post(`${API_BASE}/api/fpl/bind`, {
        teamId: Number(teamId),
        telegramId: auth.user.telegramId
      });
      const res = await axios.get(`${API_BASE}/api/fpl/myteam?telegramId=${auth.user.telegramId}`);
      setMyTeam(res.data);
    } catch (e) {
      alert('Could not bind team. Check the ID and try again.');
    }
  };

  if (auth?.error) {
    return <div style={styles.container}><p style={{ color: 'red' }}>{auth.error}</p></div>;
  }
  if (!auth) return <div style={styles.container}>Authenticating...</div>;

  return (
    <div style={styles.container}>
      <h2>⚽ Fantasy Premier League</h2>
      <p style={{ color: '#666' }}>Logged in as <b>{auth.user.username}</b></p>

      {/* My Team section */}
      {myTeam && (
        <div style={styles.card}>
          <h3>My FPL Team</h3>
          <p><b>{myTeam.name}</b></p>
          <p>Overall Rank: #{myTeam.overallRank}</p>
          <p>Total Points: {myTeam.overallPoints}</p>
        </div>
      )}

      {/* Bind a team */}
      <div style={styles.card}>
        <h3>{myTeam ? 'Change FPL Team' : 'Link Your FPL Team'}</h3>
        <p style={{ fontSize: 12, color: '#666' }}>
          Find your Team ID in the URL on fantasy.premierleague.com — e.g. .../entry/<b>123456</b>/event/1
        </p>
        <input
          style={styles.input}
          value={teamId}
          onChange={e => setTeamId(e.target.value)}
          placeholder="Enter FPL Team ID"
        />
        <button style={styles.button} onClick={bindTeam} disabled={!teamId}>
          {myTeam ? 'Update Team' : 'Link Team'}
        </button>
      </div>

      {/* Look up any team */}
      <div style={styles.card}>
        <h3>Look Up Any Team</h3>
        <input
          style={styles.input}
          value={teamId}
          onChange={e => setTeamId(e.target.value)}
          placeholder="Team ID"
        />
        <button style={styles.button} onClick={loadTeam} disabled={!teamId || loading}>
          {loading ? 'Loading...' : 'Load Team'}
        </button>
        {team && !team.error && (
          <div style={{ marginTop: 10 }}>
            <p><b>{team.name}</b></p>
            <p>Rank: #{team.summary_overall_rank}</p>
            <p>Points: {team.summary_overall_points}</p>
          </div>
        )}
        {team?.error && <p style={{ color: 'red' }}>{team.error}</p>}
      </div>

      {/* League standings */}
      <div style={styles.card}>
        <h3>League Standings</h3>
        <input
          style={styles.input}
          value={leagueId}
          onChange={e => setLeagueId(e.target.value)}
          placeholder="League ID"
        />
        <button style={styles.button} onClick={loadLeague} disabled={!leagueId || loading}>
          {loading ? 'Loading...' : 'Load League'}
        </button>
        {league && !league.error && league.standings && (
          <div style={{ marginTop: 10 }}>
            <h4>{league.league?.name}</h4>
            <table style={styles.table}>
              <thead>
                <tr><th>#</th><th>Team</th><th>Points</th></tr>
              </thead>
              <tbody>
                {league.standings.results.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{row.entry_name}</td>
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {league?.error && <p style={{ color: 'red' }}>{league.error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 20, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' },
  card: { background: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', marginBottom: 8, boxSizing: 'border-box' },
  button: { padding: '10px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
};