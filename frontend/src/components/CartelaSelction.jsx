import React, { useState, useEffect } from "react";
import "./CartelaSelction.css";
import { motion } from "framer-motion";
import cartela from "./cartela.json";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import socket from "../socket";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function CartelaSelction() {
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};

  // ---------- 1. Get roomId from URL (only safe parameter) ----------
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId") || "";          // e.g. "7" or "10"
  const stake = (() => {
    // If stake is explicitly in URL (legacy), use it; otherwise derive from roomId
    const stakeParam = searchParams.get("stake");
    if (stakeParam && !isNaN(stakeParam)) return Number(stakeParam);
    return roomId ? Number(roomId) : 0;
  })();

  // ---------- 2. Get initData from Telegram WebApp ----------
 const tg = window.Telegram?.WebApp;
if (tg) tg.ready();        // ← IMPORTANT: tell Telegram the app is ready
const initData = tg?.initData; // signed string – the only thing we trust

  // ---------- 3. States (existing + new for authentication) ----------
  const [selectedCartelas, setSelectedCartelas] = useState([]);
  const [totalAward, setTotalAward] = useState(0);
  const [finalSelectedCartelas, setFinalSelectedCartelas] = useState([]);
  const [timer, setTimer] = useState(null);
  const [wallet, setWallet] = useState(0);
  const [activeGame, setActiveGame] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myConfirmedCartelas, setMyConfirmedCartelas] = useState([]);
  const [otherUsersCartelas, setOtherUsersCartelas] = useState([]);

  // NEW: authentication state
  const [authenticated, setAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);   // { telegramId, username, wallet }

  // ---------- 4. Remove getClientId() – no longer needed ----------
  // (You can delete the entire getClientId function and its usage)

  // ---------- 5. Helper: authenticate via backend ----------
  const authenticate = async () => {
    if (!initData) {
      toast.error("No Telegram authentication data. Please restart from the bot.");
      tg?.close();
      throw new Error("Missing initData");
    }
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/verify-init-data`,
        { initData }
      );
      if (!response.data.success) throw new Error(response.data.error || "Authentication failed");
      const { user } = response.data;
      setUserInfo(user);
      setWallet(user.wallet);
      return user;
    } catch (err) {
      console.error("Auth error:", err);
      toast.error(err.response?.data?.error || "Authentication failed. Please restart.");
      tg?.close();
      throw err;
    }
  };

  // ---------- 6. Fetch wallet data (using authenticated telegramId) ----------
  const fetchWalletData = async () => {
    if (!userInfo?.telegramId) return 0;
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/depositcheckB`,
        { telegramId: userInfo.telegramId }
      );
      let walletValue;
      if (typeof response.data === 'object' && response.data !== null) {
        walletValue = response.data.wallet || response.data.balance || 0;
      } else if (typeof response.data === 'number') {
        walletValue = response.data;
      } else if (typeof response.data === 'string' && !isNaN(response.data)) {
        walletValue = parseFloat(response.data);
      } else {
        console.error("Unexpected response format:", response.data);
        walletValue = 0;
      }
      setWallet(walletValue);
      return walletValue;
    } catch (err) {
      console.error("Failed to fetch wallet data:", err.response ? err.response.data : err.message);
//toast.error("Failed to load wallet data.");
      return 0;
    }
  };

  // ---------- 7. Socket connection management (unchanged) ----------
  useEffect(() => {
    if (socket.disconnected) socket.connect();
  }, []);

  // Restore confirmed cartelas from localStorage after refresh (unchanged)
  useEffect(() => {
    if (myConfirmedCartelas.length > 0) {
      localStorage.setItem("myConfirmedCartelas", JSON.stringify(myConfirmedCartelas));
    }
  }, [myConfirmedCartelas]);

  useEffect(() => {
    const savedCartelas = localStorage.getItem("myConfirmedCartelas");
    if (savedCartelas) setMyConfirmedCartelas(JSON.parse(savedCartelas));
  }, []);

  // ---------- 8. MAIN INITIALIZATION EFFECT (with initData authentication) ----------
  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        // 8a. Authenticate via initData (gets userInfo)
        const user = await authenticate();
        if (!isMounted) return;

        // 8b. Refresh wallet (optional, but ensures fresh balance)
        await fetchWalletData();

        // 8c. Authenticate socket connection
        socket.emit("authenticate", { initData });

        socket.once("auth_success", () => {
          if (!isMounted) return;
          setAuthenticated(true);
          // 8d. Join room – send only roomId (server knows user from authenticated socket)
          socket.emit("joinRoom", { roomId });
          setIsLoading(false);
        });

        socket.once("auth_error", (err) => {
          toast.error(err.message);
          tg?.close();
        });

        // 8e. All existing socket listeners (unchanged except no clientId in emits)
        const handleGameState = (state) => {
          if (state.timer != null) setTimer(state.timer);
          if (state.activeGame != null) setActiveGame(state.activeGame);
          setMyConfirmedCartelas(state.myCartelas || []);
          if (state.activeGame) {
            setOtherUsersCartelas([]);
          } else {
            const otherCartelas = (state.selectedIndexes || []).filter(
              (index) => !state.myCartelas.includes(index)
            );
            setOtherUsersCartelas(otherCartelas);
          }
        };
        socket.on("currentGameState", handleGameState);

        // Cleanup listener on unmount
        return () => {
          socket.off("currentGameState", handleGameState);
        };
      } catch (err) {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [roomId, initData]); // depend on roomId and initData

  // ---------- 9. Wallet updates from server (unchanged) ----------
  useEffect(() => {
    const handleWalletUpdate = ({ wallet: updatedWallet }) => {
      if (updatedWallet !== undefined && updatedWallet !== null) setWallet(updatedWallet);
    };
    socket.on("walletUpdate", handleWalletUpdate);
    return () => socket.off("walletUpdate", handleWalletUpdate);
  }, []);

  // ---------- 10. Other Socket event listeners (modified to remove clientId) ----------
  useEffect(() => {
    const onCartelaAccepted = ({ cartelaIndex, Wallet: updatedWallet }) => {
      setSelectedCartelas((prev) => prev.filter((idx) => idx !== cartelaIndex));
      setMyConfirmedCartelas((prev) => Array.from(new Set([...prev, cartelaIndex])));
      if (updatedWallet != null) setWallet(updatedWallet);
    };

    const onCartelaError = ({ message }) => toast.error(message || "Cartela selection error");
    const onCountdown = (seconds) => setTimer(seconds);
const onAwardUpdate = ({ totalAward }) => {
   // console.log("🏆 Award update received:", totalAward);
    setTotalAward(totalAward);
};
 const onGameStarted = ({ totalAward }) => {
    setTotalAward(totalAward);
  };
    const onCountdownEnd = (cartelasFromServer) => {
      if (!cartelasFromServer || cartelasFromServer.length === 0) {
        toast.error("You did not select any cartela. Please select at least one.");
        return;
      }
      localStorage.setItem("myCartelas", JSON.stringify(cartelasFromServer));
      // Tell server this player is now in-game – no clientId needed
      socket.emit("markPlayerInGame", { roomId });
      // Navigate to BingoBoard with state (unchanged)
      const queryString = new URLSearchParams({
        username: userInfo?.username || "",
        telegramId: userInfo?.telegramId || "",
        roomId,
        stake,
      }).toString();
      navigate(`/BingoBoard?${queryString}`, {
        state: {
          username: userInfo?.username,
          roomId,
          stake,
          myCartelas: cartelasFromServer,
          telegramId: userInfo?.telegramId,
        },
      });
    };

    const onUpdateSelectedCartelas = ({ selectedIndexes }) => {
      if (activeGame) {
        setOtherUsersCartelas([]);
      } else {
        const newOtherCartelas = selectedIndexes.filter(
          (index) => !myConfirmedCartelas.includes(index)
        );
        setOtherUsersCartelas(newOtherCartelas);
      }
    };

    const onActiveGameStatus = ({ activeGame }) => setActiveGame(activeGame);
    const onCartelaRejected = ({ message }) => toast.error(message || "Cannot select this cartela");

    const onRoomAvailable = () => {
      setActiveGame(false);
      setSelectedCartelas([]);
      setFinalSelectedCartelas([]);
      setTimer(null);
      setTotalAward(0);
      fetchWalletData(); // refresh wallet
    };

    socket.on("cartelaAccepted", onCartelaAccepted);
    socket.on("cartelaError", onCartelaError);
    socket.on("awardUpdate", onAwardUpdate);
    socket.on("startCountdown", onCountdown);
    socket.on("myCartelas", onCountdownEnd);
    socket.on("updateSelectedCartelas", onUpdateSelectedCartelas);
    socket.on("activeGameStatus", onActiveGameStatus);
    socket.on("cartelaRejected", onCartelaRejected);
    socket.on("roomAvailable", onRoomAvailable);
    socket.on("gameStarted", onGameStarted);
// Add this with your other socket.on calls (around line 140)


// Add this with your other socket.on


// Add this to cleanup (in the return statement)

    return () => {
      socket.off("cartelaAccepted", onCartelaAccepted);
      socket.off("cartelaError", onCartelaError);
      socket.off("startCountdown", onCountdown);
      socket.off("myCartelas", onCountdownEnd);
      socket.off("updateSelectedCartelas", onUpdateSelectedCartelas);
      socket.off("activeGameStatus", onActiveGameStatus);
      socket.off("cartelaRejected", onCartelaRejected);
      socket.off("roomAvailable", onRoomAvailable);
       socket.off("gameStarted", onGameStarted);
       socket.off("awardUpdate", onAwardUpdate);
    };
  }, [navigate, roomId, stake, userInfo, activeGame, myConfirmedCartelas]);

  // ---------- 11. Check if player is already in an active game (on refresh) ----------
  useEffect(() => {
    if (!authenticated || !roomId || !userInfo) return;
    // No need to send clientId – server uses authenticated socket
    socket.emit("checkPlayerStatus", { roomId });

    const handlePlayerStatus = ({ inGame, selectedCartelas }) => {
      if (inGame) {
        const queryString = new URLSearchParams({
          username: userInfo.username,
          telegramId: userInfo.telegramId,
          roomId,
          stake,
        }).toString();
        navigate(`/BingoBoard?${queryString}`, {
          state: {
            username: userInfo.username,
            roomId,
            stake,
            myCartelas: selectedCartelas,
            telegramId: userInfo.telegramId,
          },
        });
      }
    };

    socket.on("playerStatus", handlePlayerStatus);
    return () => socket.off("playerStatus", handlePlayerStatus);
  }, [authenticated, roomId, userInfo, navigate, stake]);

  // ---------- 12. Button Handlers (only clientId removal) ----------
  const handleButtonClick = (index) => {
    if (activeGame) return toast.error("Game in progress – wait until it ends");
    if (finalSelectedCartelas.includes(index)) return;
    if (wallet < stake) {
      toast.error("Insufficient balance to select cartela");
      return;
    }
    if (selectedCartelas.length > 0) {
      toast.error("Please confirm your current selection first");
      return;
    }
    if (selectedCartelas.length >= 4) {
      toast.error("You can only select up to 4 cartelas");
      return;
    }
    setSelectedCartelas([index]);
  };

  const handleremoveCartela = () => setSelectedCartelas([]);

  const handleAddCartela = () => {
    if (activeGame) return toast.error("Cannot add cartela – game in progress");
    if (!selectedCartelas.length) return toast.error("Select at least one cartela first");
    if (wallet < stake * selectedCartelas.length) {
      toast.error("Insufficient balance for selected cartelas");
      return;
    }
    selectedCartelas.forEach((idx) => {
      // No clientId needed – server identifies user from authenticated socket
      socket.emit("selectCartela", { roomId, cartelaIndex: idx });
    });
    setSelectedCartelas([]);
  };

const refreshpg = () => {
  // Navigate to BingoBoard with refresh flag
  const queryString = new URLSearchParams({
    username: userInfo?.username || "",
    telegramId: userInfo?.telegramId || "",
    roomId: roomId,
    stake: stake,
    refresh: Date.now()
  }).toString();
  
  navigate(`/BingoBoard?${queryString}`, {
    state: {
      username: userInfo?.username,
      roomId,
      stake,
      telegramId: userInfo?.telegramId,
      refresh: Date.now()
    }
  });
};

  // ---------- 13. Render (unchanged) ----------
  if (isLoading || !authenticated) return null;

  return (
    <React.Fragment>
      <div className="Cartelacontainer-wrapper">
        <div className="wallet-stake-display">
          <div className="display-btn">Wallet: {Math.floor(wallet)}</div>

          <div className="display-btn">Active Game: {activeGame ? "1" : "0"}</div>
           <div className="display-btn" style={{backgroundColor: '#dbaff8a5', color: '#000', fontWeight: 'bold'}}>Award: {Math.floor(totalAward)} ETB</div>
          <div className="display-btn">Stake: {stake} ETB</div>
        </div>

        {activeGame ? (
          <div className="timer-display">Game started – please wait…</div>
        ) : (
          timer !== null && (
            <div className="timer-display">
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
            </div>
          )
        )}

        <div className="Cartelacontainer">
          {cartela.map((_, index) => {
            const isSelectedByMe = selectedCartelas.includes(index) || myConfirmedCartelas.includes(index);
            const isSelectedByOthers = otherUsersCartelas.includes(index);
            return (
              <button
                key={`cartela-btn-${index}`}
                onClick={() => handleButtonClick(index)}
                className="cartela"
                style={{
                  background: isSelectedByOthers ? "#f52622" : isSelectedByMe ? "green" : "#d3c6b794",
                  color: isSelectedByOthers || isSelectedByMe ? "white" : "black",
                  cursor: isSelectedByOthers || activeGame ? "not-allowed" : "pointer",
                }}
                disabled={isSelectedByOthers || activeGame || wallet < stake}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {selectedCartelas.length > 0 && (
          <div className="selection-controls-area">
            <div className="pending-cartelas">
              <div className="cartela-display1 pending">
                {cartela[selectedCartelas[selectedCartelas.length - 1]].cart.map((row, rowIndex) => (
                  <div key={rowIndex} className="cartela-row1">
                    {row.map((cell, cellIndex) => (
                      <span key={cellIndex} className="cartela-cell1">{cell}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="side-button-container">
              <button
                className="game_start"
                disabled={activeGame || wallet < stake}
                onClick={handleAddCartela}
              >
                Confirm
              </button>
              <button className="game_start1" onClick={handleremoveCartela}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </React.Fragment>
  );
}

export default CartelaSelction;