import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import "./FplDashboard.css";
import socket from "../socket"; 
const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const getPosStyle = (pos) => {
  if (pos === 1) return { bg: '#f39c12', text: 'GK' };
  if (pos === 2) return { bg: '#2ecc71', text: 'DEF' };
  if (pos === 3) return { bg: '#3498db', text: 'MID' };
  return { bg: '#e74c3c', text: 'FWD' };
};

const posLimits = { 1: 2, 2: 5, 3: 5, 4: 3 };

export default function FplDashboard() {
    const [gameState, setGameState] = useState('lobby'); // 'lobby', 'building', 'waiting', 'matchup'
  const [roomStake, setRoomStake] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [players, setPlayers] = useState([]);
  const [mySquad, setMySquad] = useState([]); 
  const [filterPos, setFilterPos] = useState(0); 
  const [selectedClub, setSelectedClub] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [tgId, setTgId] = useState(null);
  const [captainId, setCaptainId] = useState(null);
  const [showCaptainModal, setShowCaptainModal] = useState(false);
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
  // Listen for Match Found
  useEffect(() => {
    const handleMatchStart = (matchData) => {
      // Figure out who the opponent is
      const opp = matchData.player1.telegramId === tgId ? matchData.player2 : matchData.player1;
      setOpponent(opp);
      setMatchData(matchData);
      setGameState('matchup');
    };

    const handleError = (err) => {
      alert(err.message);
      setGameState('building'); // Send them back to edit their team
    };

    socket.on("fpl_match_start", handleMatchStart);
    socket.on("fpl_error", handleError);

    // Cleanup when leaving the page
    return () => {
      socket.off("fpl_match_start", handleMatchStart);
      socket.off("fpl_error", handleError);
    };
  }, [tgId]);
  // Calculate Budget & Positions
  const budget = 100.0;
  const spent = mySquad.reduce((sum, id) => {/*  */
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

    // Inside your existing handleSave function:
  const handleSave = async () => {
    if (mySquad.length !== 15) return alert(`Pick exactly 15 players. You have ${mySquad.length}.`);
    if (!captainId) return alert("Please select a Captain!");
    if (!tgId) return alert("Authentication error.");

    try {
      // 1. Save to DB first
      await axios.post(`${API_BASE}/api/fpl/save-squad`, {
        telegramId: tgId,
        squadIds: mySquad,
        captainId: captainId
      });

      // 2. Tell Socket.io to join the room and wait for an opponent
      // (Assuming you have imported your socket instance)
          socket.emit("fpl_join_room", {
        telegramId: tgId,
        roomId: roomStake,
        squadIds: mySquad,
        captainId: captainId,
        
        // Send the calculated points to the backend!
        totalScore: mySquad.reduce((sum, id) => {
          const p = players.find(x => x.id === id);
          const pts = p ? p.totalPoints : 0;
          return sum + (id === captainId ? pts * 2 : pts);
        }, 0)
      });

      setGameState('waiting');
      
    } catch (err) {
      console.error(err);
      alert("Failed to save squad. Do you have enough balance?");
    }
  };
  if (gameState === 'lobby') {
    return (
      <div className="fpl-app" style={{ padding: 20 }}>
        <h2 style={{ color: 'white', textAlign: 'center' }}>⚽ FPL Multiplayer</h2>
        <p style={{ color: '#aaa', textAlign: 'center', marginBottom: 30 }}>
          Select a room to play Head-to-Head against another manager!
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {[10, 20, 50].map(stake => (
            <button 
              key={stake} 
              className="save-btn" 
              style={{ padding: 20, fontSize: 18, background: '#2c3547', color: 'white' }}
              onClick={() => {
                setRoomStake(stake);
                setGameState('building');
              }}
            >
              Join Room {stake} ETB
            </button>
          ))}
        </div>
      </div>
    );
  }
   if (gameState === 'waiting') {
    return (
      <div className="fpl-app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', height: '100vh' }}>
        <h2 style={{ color: 'white' }}>Searching for Opponent...</h2>
        <p style={{ color: '#aaa' }}>Room Stake: {roomStake} ETB</p>
        
        <div className="spinner" style={{ width: 50, height: 50, border: '5px solid #2c3547', borderTop: '5px solid #2ecc71', borderRadius: '50%', animation: 'spin 1s linear infinite', marginTop: 20 }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        
        <button 
          className="action-btn" 
          style={{ marginTop: 40, padding: '12px 24px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}
          onClick={() => {
            socket.emit("fpl_cancel_match", { roomId: roomStake });
            setGameState('lobby');
            setMySquad([]);
            setCaptainId(null);
          }}
        >
          Cancel Search
        </button>
      </div>
    );
  }

    if (gameState === 'matchup' && opponent && matchData) {
    // Determine if I won, lost, or drew based on the backend data
    let resultText = "🤝 It's a Draw!";
    let resultColor = "#f1c40f"; // Yellow
    
    // Note: we need to know who I am to check if I won
    const myScore = matchData.player1.telegramId === tgId ? matchData.player1.totalScore : matchData.player2.totalScore;
    const oppScore = matchData.player1.telegramId === tgId ? matchData.player2.totalScore : matchData.player1.totalScore;

    if (matchData.winner) {
      if (matchData.winner.telegramId === tgId) {
        resultText = "🎉 You Won!";
        resultColor = "#2ecc71"; // Green
      } else {
        resultText = "❌ You Lost.";
        resultColor = "#e74c3c"; // Red
      }
    }

    return (
      <div className="fpl-app" style={{ padding: 20 }}>
        <h2 style={{ color: 'white', textAlign: 'center' }}>⚔️ Match Result</h2>
        
        <h1 style={{ color: resultColor, textAlign: 'center', marginTop: 40, fontSize: 32 }}>
          {resultText}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h3 style={{ color: '#2ecc71' }}>You</h3>
            <p style={{ color: 'white', fontSize: 24 }}>{myScore} pts</p>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h3 style={{ color: '#e74c3c' }}>{opponent.username}</h3>
            <p style={{ color: 'white', fontSize: 24 }}>{oppScore} pts</p>
          </div>
        </div>

        <button 
          className="save-btn" 
          style={{ marginTop: 50, width: '100%', padding: 15 }}
          onClick={() => {
            setGameState('lobby');
            setOpponent(null);
            setMySquad([]);
            setCaptainId(null);
          }}
        >
          Play Again
        </button>
      </div>
    );
  }
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
           <button 
    className="captain-text" 
    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
    onClick={() => {
      if (mySquad.length !== 15) return alert("You must pick 15 players first!");
      setShowCaptainModal(true);
    }}
  >
    👑 Captain
  </button>
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
         <button className="action-btn" onClick={() => { setMySquad([]); setCaptainId(null); }}>Reset</button>
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
                <div className="player-name">    {player.name} {captainId === player.id && <span style={{ color: '#f1c40f' }}>(C)</span>}</div>
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
          {/* CAPTAIN MODAL */}
      {showCaptainModal && (
        <div className="modal-overlay" onClick={() => setShowCaptainModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Select Captain</h3>
            <p>Your captain gets double points!</p>
            <div className="modal-list">
              {mySquad.map(id => {
                const player = players.find(p => p.id === id);
                if (!player) return null;
                return (
                  <div 
                    key={id} 
                    className={`player-row ${captainId === id ? 'selected' : ''}`}
                    onClick={() => {
                      setCaptainId(id);
                      setShowCaptainModal(false);
                    }}
                  >
                    <div className="player-left">
                      <img src={player.photo} className="player-photo" alt="" />
                      <div className="player-info">
                        <div className="player-name">{player.name}</div>
                        <div className="player-team">{player.team}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="save-btn" style={{ marginTop: 15, width: '100%' }} onClick={() => setShowCaptainModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
  </div>
);
}