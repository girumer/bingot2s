import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
  
// Helper to get colors for positions
const getPosStyle = (pos) => {
  if (pos === 1) return { bg: '#f39c12', text: 'GK' }; // Orange
  if (pos === 2) return { bg: '#2ecc71', text: 'DEF' }; // Green
  if (pos === 3) return { bg: '#3498db', text: 'MID' }; // Blue
  return { bg: '#e74c3c', text: 'FWD' }; // Red
};

export default function FplDashboard() {
  const [players, setPlayers] = useState([]);
  const [mySquad, setMySquad] = useState([]); // Array of selected player IDs
  const [filterPos, setFilterPos] = useState(0); // 0=ALL, 1=GK, 2=DEF, 3=MID, 4=FWD
  const [loading, setLoading] = useState(true);
  const [tgId, setTgId] = useState(null);
  // 1. Fetch Players on Load
   useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    
    if (initData) {
      try {
        // Extract Telegram ID from the WebApp data
        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(urlParams.get('user'));
        setTgId(user.id);
      } catch (e) {
        console.error("Could not parse Telegram user data", e);
      }
    }

    // Fetch players
    axios.get(`${API_BASE}/api/fpl/bootstrap`)
      .then(res => {
        setPlayers(res.data.players);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load players");
        setLoading(false);
      });
  }, []);

  // 2. Calculate Budget & Positions
  const budget = 100.0;
  const spent = mySquad.reduce((sum, id) => {
    const p = players.find(x => x.id === id);
    return sum + (p ? p.price : 0);
  }, 0);
  const remainingBudget = (budget - spent).toFixed(1);

  const getPosCount = (posType) => {
    return mySquad.filter(id => {
      const p = players.find(x => x.id === id);
      return p && p.position === posType;
    }).length;
  };

  const posLimits = { 1: 2, 2: 5, 3: 5, 4: 3 }; // GK, DEF, MID, FWD

  // 3. Toggle Player Selection
  const togglePlayer = (player) => {
    const isSelected = mySquad.includes(player.id);

    if (isSelected) {
      // Remove from squad
      setMySquad(mySquad.filter(id => id !== player.id));
    } else {
      // Add to squad (Check rules)
      if (mySquad.length >= 15) return alert("Squad is full (15 players).");
      if (getPosCount(player.position) >= posLimits[player.position]) {
        return alert(`You can only pick ${posLimits[player.position]} players for this position.`);
      }
      if (spent + player.price > budget) {
        return alert("Not enough budget!");
      }
      setMySquad([...mySquad, player.id]);
    }
  };

  // 4. Filter Players
  const filteredPlayers = players.filter(p => filterPos === 0 || p.position === filterPos);

  if (loading) return <div style={{ padding: 20, color: 'white' }}>Loading players...</div>;
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
      
      // Show success using Telegram's native UI if available, otherwise standard alert
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
  return (
    <div style={styles.appContainer}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>My Squad</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#aaa' }}>
            {mySquad.length}/15 · Budget: {remainingBudget} ETB left
          </p>
        </div>
        <button style={styles.saveBtn} onClick={handleSave}>Save</button>
      </div>

      {/* CONTROLS */}
      <div style={styles.controls}>
        <button style={styles.pickBtn}>⚽ Pick Players ({mySquad.length}/15)</button>
        <div style={{ color: '#aaa', fontSize: 14 }}>👑 Captain</div>
      </div>{/*  */}

      {/* POSITION COUNTERS */}
      <div style={styles.posCounters}>
        {[1, 2, 3, 4].map(pos => {
          const style = getPosStyle(pos);
          return (
            <div key={pos} style={{ textAlign: 'center' }}>
              <div style={{ color: '#ccc', fontSize: 12, fontWeight: 'bold' }}>{style.text}</div>
              <div style={{ color: getPosCount(pos) >= posLimits[pos] ? style.bg : '#fff', fontSize: 14 }}>
                {getPosCount(pos)}/{posLimits[pos]}
              </div>
            </div>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button style={styles.actionBtn} onClick={() => setMySquad([])}>Reset</button>
          <button style={styles.actionBtn}>Auto</button>
        </div>
      </div>

      {/* FILTERS */}
      <div style={styles.filters}>
        {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map((label, idx) => (
          <button
            key={label}
            style={filterPos === idx ? styles.filterBtnActive : styles.filterBtn}
            onClick={() => setFilterPos(idx)}
          >
            {label}
          </button>
        ))}
        <select style={styles.dropdown}>
          <option>All Clubs</option>
        </select>
      </div>

      {/* PLAYER LIST */}
      <div style={styles.playerList}>
        {filteredPlayers.map(player => {
          const isSelected = mySquad.includes(player.id);
          const posStyle = getPosStyle(player.position);
          
          return (
            <div 
              key={player.id} 
              style={isSelected ? styles.playerRowSelected : styles.playerRow}
              onClick={() => togglePlayer(player)}
            >
              {/* Left: Photo & Position */}
            {/* Left: Photo & Position */}
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
  <div style={{ position: 'relative', width: 40, height: 40 }}>
    {/* Player Photo */}
    <img 
      src={player.photo} 
      alt={player.name}
      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#2c3547' }}
      onError={(e) => { e.target.style.display = 'none'; }} // Hide if no photo
    />
    {/* Position Badge overlaying the photo */}
    <div style={{ 
      position: 'absolute', bottom: -2, right: -2, 
      background: posStyle.bg, color: 'white', 
      fontSize: 9, fontWeight: 'bold', 
      padding: '2px 4px', borderRadius: 4,
      border: '2px solid #1a1f2b'
    }}>
      {posStyle.text}
    </div>
  </div>
  <div>
    <div style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>{player.name}</div>
    <div style={{ color: '#888', fontSize: 13 }}>{player.team}</div>
  </div>
</div>

              {/* Right: Points, Price, Checkmark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ color: '#f1c40f', fontSize: 13 }}>★ {player.totalPoints}</div>
                <div style={{ color: '#2ecc71', fontSize: 14, fontWeight: 'bold' }}>{player.price}</div>
                <div style={{ 
                  width: 20, height: 20, borderRadius: '50%', 
                  border: isSelected ? '6px solid #2ecc71' : '2px solid #555',
                  background: isSelected ? '#2ecc71' : 'transparent'
                }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- DARK THEME STYLES (Matching your screenshot) ---
const styles = {
  appContainer: { background: '#1a1f2b', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #2c3547' },
  saveBtn: { background: '#1e4d40', color: '#2ecc71', border: '1px solid #2ecc71', padding: '6px 15px', borderRadius: 20, fontWeight: 'bold' },
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px' },
  pickBtn: { background: '#1e4d40', color: '#2ecc71', border: '1px solid #2ecc71', padding: '10px 15px', borderRadius: 8, flex: 1, marginRight: 15, fontWeight: 'bold' },
  posCounters: { display: 'flex', gap: 20, padding: '10px 15px', background: '#212736', borderBottom: '1px solid #2c3547' },
  actionBtn: { background: '#2c3547', color: '#ccc', border: 'none', padding: '6px 12px', borderRadius: 6 },
  filters: { display: 'flex', gap: 8, padding: '10px 15px', overflowX: 'auto' },
  filterBtn: { background: '#2c3547', color: '#ccc', border: 'none', padding: '6px 15px', borderRadius: 20, fontWeight: 'bold' },
  filterBtnActive: { background: '#2ecc71', color: 'white', border: 'none', padding: '6px 15px', borderRadius: 20, fontWeight: 'bold' },
  dropdown: { background: '#2c3547', color: '#ccc', border: 'none', padding: '6px 10px', borderRadius: 6, marginLeft: 'auto' },
  playerList: { paddingBottom: 60 }, // space for bottom nav
  playerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #212736', cursor: 'pointer' },
  playerRowSelected: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #212736', background: '#2c3547', cursor: 'pointer' }
};