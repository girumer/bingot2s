import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import "./FplDashboard.css";

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const getPosStyle = (pos) => {
  if (pos === 1) return { bg: '#f39c12', text: 'GK' };
  if (pos === 2) return { bg: '#2ecc71', text: 'DEF' };
  if (pos === 3) return { bg: '#3498db', text: 'MID' };
  return { bg: '#e74c3c', text: 'FWD' };
};

const posLimits = { 1: 2, 2: 5, 3: 5, 4: 3 };

export default function FplDashboard() {
  const [players, setPlayers] = useState([]);
  const [mySquad, setMySquad] = useState([]); 
  const [filterPos, setFilterPos] = useState(0); 
  const [selectedClub, setSelectedClub] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [tgId, setTgId] = useState(null);

  // Fetch Players on Load
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(urlParams.get('user'));
        if (user) setTgId(user.id);
      } catch (e) {
        console.error("Could not parse Telegram user data", e);
      }
    }

    axios.get(`${API_BASE}/api/fpl/bootstrap`)
      .then(res => {
        setPlayers(res.data.players || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load players");
        setLoading(false);
      });
  }, []);

  // Calculate Budget & Positions
  const budget = 100.0;
  const spent = mySquad.reduce((sum, id) => {
    const p = players.find(x => x.id === id);
    return sum + (p ? Number(p.price) : 0);
  }, 0);

  const remainingBudget = (budget - spent).toFixed(1);

  const getPosCount = (posType) => {
    return mySquad.filter(id => {
      const p = players.find(x => x.id === id);
      return p && p.position === posType;
    }).length;
  };

  // Toggle Player Selection
  const togglePlayer = (player) => {
    const isSelected = mySquad.includes(player.id);

    if (isSelected) {
      setMySquad(mySquad.filter(id => id !== player.id));
    } else {
      if (mySquad.length >= 15) return alert("Squad is full (15 players).");
      if (getPosCount(player.position) >= posLimits[player.position]) {
        return alert(`You can only pick ${posLimits[player.position]} players for this position.`);
      }
      if (spent + Number(player.price) > budget) {
        return alert("Not enough budget!");
      }
      setMySquad([...mySquad, player.id]);
    }
  };

  // Auto Pick Squad Logic
  const handleAutoPick = () => {
    let currentSquad = [];
    let currentSpent = 0;

    // Pick top players by points within limits and budget
    const sorted = [...players].sort((a, b) => b.totalPoints - a.totalPoints);
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    for (const player of sorted) {
      const pos = player.position;
      const price = Number(player.price);
      if (counts[pos] < posLimits[pos] && currentSpent + price <= budget) {
        currentSquad.push(player.id);
        counts[pos] += 1;
        currentSpent += price;
      }
      if (currentSquad.length === 15) break;
    }

    setMySquad(currentSquad);
  };

  // Clubs List for Dropdown
  const clubs = useMemo(() => {
    return Array.from(new Set(players.map(p => p.team))).filter(Boolean);
  }, [players]);

  // Filtered Players
  const filteredPlayers = players.filter(p => {
    const matchesPos = filterPos === 0 || p.position === filterPos;
    const matchesClub = selectedClub === 'ALL' || p.team === selectedClub;
    return matchesPos && matchesClub;
  });

  const handleSave = async () => {
    if (mySquad.length !== 15) {
      return alert(`You must pick exactly 15 players. You currently have ${mySquad.length}.`);
    }
    if (!tgId) {
      return alert("Could not authenticate Telegram user.");
    }

    try {
      await axios.post(`${API_BASE}/api/fpl/save-squad`, {
        telegramId: tgId,
        squadIds: mySquad
      });
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert("Squad saved successfully! ✅");
      } else {
        alert("Squad saved successfully! ✅");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save squad. Please try again.");
    }
  };

  if (loading) return <div className="loading-container">Loading players...</div>;

  return (
  <div className="fpl-app">
    {/* HEADER */}
    <div className="fpl-header">
      <div>
        <h2>My Squad</h2>
        <p>{mySquad.length}/15 · Budget: {remainingBudget} ETB left</p>
      </div>
      <button className="save-btn" onClick={handleSave}>Save</button>
    </div>

    {/* CONTROLS */}
    <div className="controls">
      <button className="pick-btn">⚽ Pick Players ({mySquad.length}/15)</button>
      <div className="captain-text">👑 Captain</div>
    </div>

    {/* POSITION COUNTERS */}
    <div className="pos-counters">
      <div className="pos-group">
        {[1, 2, 3, 4].map(pos => {
          const style = getPosStyle(pos);
          return (
            <div key={pos} className="pos-item">
              <div className="pos-label">{style.text}</div>
              <div className="pos-val" style={{ color: getPosCount(pos) >= posLimits[pos] ? style.bg : '#fff' }}>
                {getPosCount(pos)}/{posLimits[pos]}
              </div>
            </div>
          );
        })}
      </div>
      <div className="action-buttons">
        <button className="action-btn" onClick={() => setMySquad([])}>Reset</button>
        <button className="action-btn" onClick={handleAutoPick}>Auto</button>
      </div>
    </div>

    {/* FILTERS */}
    <div className="filters">
      {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map((label, idx) => (
        <button
          key={label}
          className={`filter-btn ${filterPos === idx ? 'active' : ''}`}
          onClick={() => setFilterPos(idx)}
        >
          {label}
        </button>
      ))}
      <select 
        className="club-select" 
        value={selectedClub} 
        onChange={(e) => setSelectedClub(e.target.value)}
      >
        <option value="ALL">All Clubs</option>
        {clubs.map(club => (
          <option key={club} value={club}>{club}</option>
        ))}
      </select>
    </div>

    {/* PLAYER LIST */}
    <div className="player-list">
      {filteredPlayers.map(player => {
        const isSelected = mySquad.includes(player.id);
        const posStyle = getPosStyle(player.position);
        
        return (
          <div 
            key={player.id} 
            className={`player-row ${isSelected ? 'selected' : ''}`}
            onClick={() => togglePlayer(player)}
          >
            <div className="player-left">
              <div className="player-photo-wrapper">
                <img 
                  src={player.photo} 
                  alt={player.name}
                  className="player-photo"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
                <span className="player-badge" style={{ background: posStyle.bg }}>
                  {posStyle.text}
                </span>
              </div>
              <div className="player-info">
                <div className="player-name">{player.name}</div>
                <div className="player-team">{player.team}</div>
              </div>
            </div>

            <div className="player-right">
              <div className="player-points">★ {player.totalPoints}</div>
              <div className="player-price">{player.price}</div>
              <div className={`player-check ${isSelected ? 'selected' : ''}`}></div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
}