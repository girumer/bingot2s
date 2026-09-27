import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./BingoBoard.css";
import cartela from "./cartela.json";
import socket from "../socket";
import { toast, ToastContainer } from "react-toastify";
const getTelegramInitData = () => {
  return window.Telegram?.WebApp?.initData || "";
};

const initData = getTelegramInitData();
function getBingoLetter(num) {
  if (num >= 1 && num <= 15) return "B";
  if (num >= 16 && num <= 30) return "I";
  if (num >= 31 && num <= 45) return "N";
  if (num >= 46 && num <= 60) return "G";
  if (num >= 61 && num <= 75) return "O";
  return "";
}

function MyCartelasSection({
  myCartelas,
  selectedIndexes,
  clickedNumbers,
  toggleNumber,
  winners,
  highlightCartelas,
  allCalledNumbers 
}) {
  if (!myCartelas || myCartelas.length === 0) return null;

  const renderCartela = (cartelaItem, idx) => {
    const cartelaIndex =
      typeof cartelaItem === "number" ? cartelaItem : cartelaItem.index;

    if (!cartela[cartelaIndex]) return null;

    const grid =
      typeof cartelaItem === "number"
        ? cartela[cartelaIndex]?.cart
        : cartelaItem?.grid;

    if (!grid) return null;

    const winner = winners.find((w) => w.cartelaIndex === cartelaIndex);

    const isWinningCell = (cell, rowIndex, cellIndex, pattern) => {
      if (!pattern) return false;
      if (pattern.includes("*") && rowIndex === 2 && cellIndex === 2) return true;
      const cellNumber = Number(cell);
      if (pattern.some(p => typeof p === "number" && p === cellNumber)) return true;
      return false;
    };

    return (
      <div className="cartela-display" key={idx}>
        <div className="cartela-header">
          {["B", "I", "N", "G", "O"].map((letter, i) => (
            <div key={i} className={`cartela-header-cell ${letter.toLowerCase()}`}>
              {letter}
            </div>
          ))}
        </div>

        <div className="cartela-rows-container">
          {grid.map((row, rowIndex) => {
            const normalizedRow =
              Array.isArray(row) && row.length === 5 ? row : Array(5).fill(null);

            return (
              <div key={rowIndex} className="cartela-row">
                {normalizedRow.map((cell, cellIndex) => (
                  <button
                    key={cellIndex}
                    className={`cartela-cell 
                      ${clickedNumbers.includes(cell) ? "clicked" : ""} 
                      ${highlightCartelas && allCalledNumbers.includes(cell) ? "highlighted" : ""} 
                      ${isWinningCell(cell, rowIndex, cellIndex, winner?.pattern) ? "winner-highlight" : ""}`}
                    onClick={() => cell && toggleNumber(cell)}
                    disabled={!cell}
                  >
                    {cell || ""}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <div className="cartela-index">card number {cartelaIndex+1}</div>

        <button className="bingo-button" onClick={() => toast.error("u click wrong pattern")}>
          Bingo
        </button>
      </div>
    );
  };

  return (
    <div className="my-cartelas" style={{ width: "100%" }}>
      <div className="cartelas-container-horizontal">
        {myCartelas.map((c, idx) => renderCartela(c, idx))}
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

function BingoBoard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const usernameFromState = location.state?.username;
  const roomIdFromState = location.state?.roomId;
  const telegramIdFromState = location.state?.telegramId;
  const usernameFromUrl = searchParams.get("username");
  const roomIdFromUrl = searchParams.get("roomId");
  const telegramIdFromUrl = searchParams.get("telegramId");
  const stakeFromUrl = Number(searchParams.get("stake")) || 0;
  const username = usernameFromState || usernameFromUrl;
  const roomId = roomIdFromState || roomIdFromUrl;
  const telegramId = telegramIdFromState || telegramIdFromUrl;
  const stake = location.state?.stake || stakeFromUrl;
  const storedCartelas = JSON.parse(localStorage.getItem("myCartelas") || "[]");
  const { myCartelas: initialCartelas } = location.state || {};
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [gameId, setGameId] = useState(null);
  const [highlightCartelas, setHighlightCartelas] = useState(true);
  const [myCartelas, setMyCartelas] = useState(initialCartelas || storedCartelas);
  const [allCalledNumbers, setAllCalledNumbers] = useState([]);
  const [lastNumber, setLastNumber] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [highlightedNumbers, setHighlightedNumbers] = useState([]);
  const [clickedNumbers, setClickedNumbers] = useState([]);
  const [timer, setTimer] = useState(null);
  const [totalAward, setTotalAward] = useState(null);
  const [winners, setWinners] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [iAmWinner, setIAmWinner] = useState(false);
const [jack, setJack] = useState({
  amount: 100,
  pending: false,
  progress: 0,
  remainingSeconds: 3600
});
  const gameIdRef = useRef(`${roomId}-${Date.now()}`);

const clientId = telegramId ? `tg_${telegramId}` : null;

  const letters = ["B", "I", "N", "G", "O"];
  const numberColumns = [
    Array.from({ length: 15 }, (_, i) => i + 1),
    Array.from({ length: 15 }, (_, i) => i + 16),
    Array.from({ length: 15 }, (_, i) => i + 31),
    Array.from({ length: 15 }, (_, i) => i + 46),
    Array.from({ length: 15 }, (_, i) => i + 61),
  ];

  const toggleNumber = (num) => {
    setClickedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };
  const refreshpg = () => {
    window.location.reload();
  };

  useEffect(() => {
    const handleReset = () => {
      const queryString = new URLSearchParams({
        username,
        telegramId,
        roomId: String(roomId),
        stake: String(stake || 0),
      }).toString();
      
      navigate(`/CartelaSelction?${queryString}`, {
        state: { username, telegramId, roomId, stake }
      });
    };

    socket.on("resetRoom", handleReset);
    return () => socket.off("resetRoom", handleReset);
  }, [navigate, username, roomId, stake, telegramId]);

  useEffect(() => {
    if (!username || !telegramId) {
      console.error("Missing authentication parameters");
      toast.error("Authentication required. Redirecting...");
      setTimeout(() => navigate("/"), 2000);
      return;
    }
    
    localStorage.setItem("username", username);
    localStorage.setItem("telegramId", telegramId);
  }, [username, telegramId, navigate]);

 useEffect(() => {
  if (!roomId || !telegramId || !clientId) return;

  let joined = false;

  const authenticateAndJoin = () => {
    const initData = window.Telegram?.WebApp?.initData || "";

    if (!initData) {
      console.error("Telegram initData is missing");
      toast.error("Telegram authentication data is missing");
      return;
    }

    console.log("🔐 Authenticating socket...");

    socket.emit("authenticate", { initData });
  };

  const handleAuthSuccess = (data) => {
    console.log("✅ Socket authenticated:", data);

    if (!joined) {
      joined = true;

      console.log("🚪 Joining room:", roomId);

      socket.emit("joinRoom", {
        roomId
      });
    }
  };

  const handleAuthError = (data) => {
    console.error("❌ Socket authentication failed:", data);

    toast.error(data?.message || "Authentication failed");
  };

  const handleGameState = (state) => {
    console.log("📦 Restored game state:", state);

    setAllCalledNumbers(state.calledNumbers || []);
    setHighlightedNumbers(state.calledNumbers || []);
    setLastNumber(state.lastNumber || null);

    // Your backend currently sends "timer", not "countdown"
    if (state.timer !== undefined && state.timer !== null) {
      setTimer(state.timer);
    }

    setSelectedIndexes(state.selectedIndexes || []);

    if (state.totalAward !== undefined && state.totalAward !== null) {
      setTotalAward(state.totalAward);
    }

    if (state.gameId !== undefined && state.gameId !== null) {
      setGameId(state.gameId);
    }
    if (state.jack) {
  setJack(state.jack);
      }
    // IMPORTANT:
    // Restore my cartelas after refresh
    if (state.myCartelas) {
      setMyCartelas(state.myCartelas);

      localStorage.setItem(
        "myCartelas",
        JSON.stringify(state.myCartelas)
      );
    }
  };

  const handleReconnect = () => {
    console.log("🔄 Socket reconnected");

    joined = false;

    // New socket.id means backend authentication must happen again
    authenticateAndJoin();
  };

  const handleDisconnect = (reason) => {
    console.log("⚠️ Socket disconnected:", reason);
  };

  socket.on("auth_success", handleAuthSuccess);
  socket.on("auth_error", handleAuthError);
  socket.on("currentGameState", handleGameState);
  socket.on("connect", authenticateAndJoin);
  socket.on("reconnect", handleReconnect);
  socket.on("disconnect", handleDisconnect);

  // Socket may already be connected when this component mounts
  if (socket.connected) {
    authenticateAndJoin();
  }

  return () => {
    socket.off("auth_success", handleAuthSuccess);
    socket.off("auth_error", handleAuthError);
    socket.off("currentGameState", handleGameState);
    socket.off("connect", authenticateAndJoin);
    socket.off("reconnect", handleReconnect);
    socket.off("disconnect", handleDisconnect);
  };
}, [roomId, telegramId, clientId]);

  useEffect(() => {
    const handleMyCartelas = (cartelasFromServer) => {
      setMyCartelas(cartelasFromServer);
      localStorage.setItem("myCartelas", JSON.stringify(cartelasFromServer));
    };
    socket.on("myCartelas", handleMyCartelas);
    return () => socket.off("myCartelas", handleMyCartelas);
  }, []);

  useEffect(() => {
    const handlePlayerCount = ({ totalPlayers }) => setTotalPlayers(totalPlayers);
    socket.on("playerCount", handlePlayerCount);
    return () => socket.off("playerCount", handlePlayerCount);
  }, []);

  useEffect(() => {
    const handleGameStarted = ({ totalAward, totalPlayers, gameId }) => {
        setTotalAward(totalAward);
        setTotalPlayers(totalPlayers);
        setGameId(gameId);
        toast.success(`Game started! Game ID: ${gameId}`);
    };
    socket.on("gameStarted", handleGameStarted);
    return () => socket.off("gameStarted", handleGameStarted);
  }, []);
useEffect(() => {

  const handleJackUpdate = (jackState) => {
    setJack(jackState);
  };

  socket.on("jack:update", handleJackUpdate);

  return () => {
    socket.off("jack:update", handleJackUpdate);
  };

}, []);
  useEffect(() => {
    const handleWinningPattern = (winnersArr) => {
      console.log("WINNERS PAYLOAD:", JSON.stringify(winnersArr, null, 2));
      setWinners(winnersArr);
      const mine = winnersArr.some((w) => w.clientId === clientId);
      setIAmWinner(mine);
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 5000);
    };
    socket.on("winningPattern", handleWinningPattern);
    return () => socket.off("winningPattern", handleWinningPattern);
  }, [clientId]);

  useEffect(() => {
    const handleNumberCalled = (number) => {
      setLastNumber(number);
      setAllCalledNumbers((prev) => [...prev, number]);
      setHighlightedNumbers((prev) => [...prev, number]);
    };

    const handleSelectedIndexes = ({ selectedIndexes }) =>
      setSelectedIndexes(selectedIndexes);

    const handleStartCountdown = (seconds) => setTimer(seconds);

    socket.on("numberCalled", handleNumberCalled);
    socket.on("updateSelectedCartelas", handleSelectedIndexes);
    socket.on("startCountdown", handleStartCountdown);

    return () => {
      socket.off("numberCalled", handleNumberCalled);
      socket.off("updateSelectedCartelas", handleSelectedIndexes);
      socket.off("startCountdown", handleStartCountdown);
    };
  }, []);

  return (
    <div className="bingo-board-wrapper">
      {/* TOP STATS */}
      <div className="top-stats">
      
         <div className="stat-button">
            GameID {gameId || "Waiting..."}
          </div>
        <div className="stat-button">
          💰 Prize{" "}
          {totalAward !== null ? totalAward.toLocaleString() + " ETB" : "Loading..."}
        </div>
   
        <div className="stat-button">👥 Players {totalPlayers}</div>
        <div className="stat-button">🔢 {allCalledNumbers.length}/75</div>
      </div>
{/* JACK BOT */}
<div className="jack-container">

  <div className="jack-header">
    <span>🎰 JACK BOT</span>

    <strong>
      {jack.amount.toLocaleString()} ETB
    </strong>
  </div>

  <div className="jack-progress-background">

    <div
      className="jack-progress-fill"
      style={{
        width: `${jack.progress}%`
      }}
    />

  </div>

  <div className="jack-info">

    {jack.pending ? (
      <span className="jack-pending">
        🎁 100 ETB READY — NEXT WINNER
      </span>
    ) : (
      <span>
        {Math.floor(jack.remainingSeconds / 60)}:
        {String(jack.remainingSeconds % 60).padStart(2, "0")}
        {" "}remaining
      </span>
    )}

    <span>
      {Math.round(jack.progress)}%
    </span>

  </div>

</div>
      {/* CORE DESKTOP AND MOBILE CONTENT SPLIT */}
    <div className="main-content-layout">
  
  {/* LEFT COLUMN: 1 TO 75 GRID SYSTEM + UTILITY PANEL */}
  {/* LEFT COLUMN: 1 TO 75 GRID SYSTEM + VERTICAL UTILITY PANEL */}
<div className="left-column-layout">
  <div className="numbers-grid-wrapper">
    {letters.map((letter, rowIndex) => {
      const letterClass = letter.toLowerCase();
      return (
        <div key={letter} className="number-column-group">
          <div className="letter-button">{letter}</div>
          {numberColumns[rowIndex].map((num) => {
            const isCalled = highlightedNumbers.includes(num);
            return (
              <button
                key={num}
                className={`number-button ${isCalled ? `called ${letterClass}` : ""}`}
                disabled
              >
                {num}
              </button>
            );
          })}
        </div>
      );
    })}
  </div>

  {/* VERTICALLY ALIGNED CONTROLS CONTAINER */}
  <div className="toggle-container-vertical">
    <div className="toggle-row-item">
      <span className="toggle-label">AUTO SELECT</span>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={highlightCartelas}
          onChange={() => setHighlightCartelas(!highlightCartelas)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
    <button className="refresh-action-button" onClick={refreshpg}>
      REFRESH GAME
    </button>
  </div>
</div>

  {/* RIGHT COLUMN: REARRANGED BALL BALL DISPLAY AND SCROLLING CARTELAS */}
  <div className="bottom-panels">
    
    <div className="fixed-control-header">
      <div className="last-called-container">
        {lastNumber !== null && (
          <div className="last-called-number">
            <span className="last-called-letter" data-letter={getBingoLetter(lastNumber)}>
              {getBingoLetter(lastNumber)}-
            </span>
            {lastNumber}
          </div>
        )}

        <div className="last-five-display">
          {allCalledNumbers.slice(-5).map((num, idx) => (
            <div key={idx} className={`last-five-number ${getBingoLetter(num).toLowerCase()}`}>
              <span className="last-five-letter">{getBingoLetter(num)}-</span>
              {num}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* INDEPENDENT VERTICAL SCROLL VIEWPORT FOR CARDS */}
    <div className="scrollable-cards-viewport">
      <div className="bottom-left">
        <div className={`cartelas-container-horizontal ${myCartelas.length === 1 ? "single-cartela" : ""}`}>
          <MyCartelasSection
            myCartelas={myCartelas}
            selectedIndexes={selectedIndexes}
            clickedNumbers={clickedNumbers}
            toggleNumber={toggleNumber}
            winners={winners}
            highlightCartelas={highlightCartelas}
            allCalledNumbers={allCalledNumbers} 
          />
        </div>
      </div>
    </div>

  </div>

</div>

      {/* WINNER POPUP */}
      {showPopup && (
        <div className="winner-popup">
          <h2>{iAmWinner ? "🎉 You won! 🎉" : "Winner(s)!"}</h2>
          <div className="cartelas-container-horizontal winner-cartelas-container">
            {winners.map((w, idx) => {
              const winnerCartela = cartela[w.cartelaIndex];
              if (!winnerCartela) return null;
              const pattern = w.pattern;

              return (
                <div key={idx} className="cartela-display winner-cartela">
                  <div className="cartela-header">
                    {["B", "I", "N", "G", "O"].map((letter, i) => (
                      <div key={i} className={`cartela-header-cell ${letter.toLowerCase()}`}>
                        {letter}
                      </div>
                    ))}
                  </div>

                  <div className="cartela-rows-container">
                    {winnerCartela.cart.map((row, rowIndex) => (
                      <div key={rowIndex} className="cartela-row">
                        {row.map((cell, cellIndex) => {
                          const isWinning = pattern && cell && pattern.some((p) => {
                            if (p === "*" && rowIndex === 2 && cellIndex === 2) return true;
                            if (typeof p === "number" && Number(cell) === p) return true;
                            return false;
                          });

                          return (
                            <button
                              key={cellIndex}
                              className={`cartela-cell ${isWinning ? "winner-highlight" : ""}`}
                              disabled
                              style={{ color: cell > 0 ? "black" : "red" }}
                            >
                              {cell}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="cartela-index">
                      Cartela {w.cartelaIndex + 1} - {w.winnerName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

export default BingoBoard;