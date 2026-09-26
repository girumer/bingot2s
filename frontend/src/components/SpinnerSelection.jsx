import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const SpinnerSelection = () => {
  const [searchParams] = useSearchParams();
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const stakeValue = 1;
  const [wallet, setWallet] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ---------- SECURE: Get initData from Telegram WebApp ----------
  const tg = window.Telegram?.WebApp;
  if (tg) tg.ready();
  const initData = tg?.initData;

  // ---------- Wheel configuration (unchanged) ----------
  const segmentThemes = [
    { value: 0, theme: 'Cabbage', color: '#6AA84F', icon: '🥬' },
    { value: 1, theme: 'Lemon', color: '#FFD966', icon: '🍋' },
    { value: 5, theme: 'Orange', color: '#FFA500', icon: '🍊' },
    { value: 10, theme: 'Apple', color: '#CC0000', icon: '🍎' },
    { value: 12, theme: 'Papaya', color: '#FF6347', icon: '🍈' },
    { value: 15, theme: 'Cinnamon', color: '#D2691E', icon: '🌰' },
    { value: 20, theme: 'Banana', color: '#FFE599', icon: '🍌' },
    { value: 25, theme: 'Pineapple', color: '#FFD700', icon: '🍍' },
    { value: 30, theme: 'Mango', color: '#F6B26B', icon: '🥭' },
    { value: 50, theme: 'Bonus', color: '#4A86E8', icon: '✨' },
  ];

  const numbers = segmentThemes.map(t => t.value);
  const segmentCount = numbers.length;
  const segmentAngle = 360 / segmentCount;

  const probabilities = {
    50: 0,
    30: 0,
    25: 0,
    20: 0,
    15: 0,
    12: 0,
    10: 0,
    5: 0,
    1: 0,
    0: 100,
  };

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const wheelRef = useRef(null);

  const conicGradient = useMemo(() => {
    const stops = segmentThemes.map((theme, index) => {
      const start = index * segmentAngle;
      const end = (index + 1) * segmentAngle;
      return `${theme.color} ${start}deg ${end}deg`;
    }).join(', ');
    return `conic-gradient(${stops})`;
  }, []);

  // ---------- Helper: get a random number (NOT used for actual win – only for animation fallback) ----------
  const getWeightedRandomNumber = () => {
    const random = Math.random() * 100;
    let cumulative = 0;
    for (const number of numbers) {
      cumulative += probabilities[number];
      if (random <= cumulative) return number;
    }
    return numbers.sort((a, b) => probabilities[b] - probabilities[a])[0];
  };

  const getResultMessage = (resultValue) => {
    if (resultValue === 0) {
      return "💔 You lost! Better luck next time! 💔";
    } else if (resultValue === 5) {
      return "😐 No win, try again! 😐";
    } else {
      return `🎉 You won: ${resultValue}! 🎉`;
    }
  };

  // ---------- SECURE: Fetch wallet using initData ----------
  const fetchWallet = async () => {
    if (!initData) return 0;
    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/depositcheckB`, { initData });
      setWallet(res.data.wallet);
      return res.data.wallet;
    } catch (err) {
      toast.error("Failed to load balance");
      return 0;
    }
  };

  // ---------- SECURE: Spin – calls backend endpoint ----------
  const spinWheel = async () => {
    if (spinning || wallet < stakeValue) {
      if (wallet < stakeValue) {
        toast.error(`Insufficient balance! You need ${stakeValue} to spin.`);
      }
      return;
    }
    setSpinning(true);
    setResult(null);

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/spin`, {
        initData,
        stake: stakeValue,
      });
      const { winAmount, newBalance } = response.data;

      setWallet(newBalance);
      setResult(winAmount);

      // Animate wheel to the winning segment (same logic as before)
      const segmentIndex = numbers.indexOf(winAmount);
      const centerAngleOfWinningSegment = segmentIndex * segmentAngle + (segmentAngle / 2);
      const segmentTargetRotation = 360 - (centerAngleOfWinningSegment + 36);
      const spins = 5 + Math.floor(Math.random() * 5);
      const targetRotation = (spins * 360) + segmentTargetRotation;

      if (wheelRef.current) {
        wheelRef.current.style.transition = 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)';
        wheelRef.current.style.transform = `rotate(${targetRotation}deg)`;
      }

      setTimeout(() => {
        setSpinning(false);
        if (winAmount > 0) toast.success(`🎉 You won ${winAmount} ETB!`);
        else toast.error("💔 You lost!");
      }, 4000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Spin failed");
      setSpinning(false);
    }
  };

  const resetWheel = () => {
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
    setResult(null);
    setSpinning(false);
  };

  // ---------- SECURE: Initialise – fetch wallet once ----------
  useEffect(() => {
    const init = async () => {
      await fetchWallet();
      setIsLoading(false);
    };
    init();
  }, [initData]);

  // ---------- Render – unchanged ----------
  if (isLoading) {
    return null;
  }

  return (
    <div className="spinner-container">
      <style>
        {`
        /* Load Inter font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

        /* SpinnerWheel.css - ADAPTED FOR SINGLE FILE */
        .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #dacfe6 0%, #03173aff 100%);
          font-family: 'Inter', sans-serif;
          color: white;
          padding: 20px;
          box-sizing: border-box;
        }

        h1 {
          margin-bottom: 40px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          font-size: 2.5rem;
          font-weight: 900;
        }

        .wheel-container {
          position: relative;
          width: 400px;
          height: 400px;
          margin-bottom: 40px;
        }

        .wheel {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          position: relative;
          box-shadow: 0 0 25px rgba(0, 0, 0, 0.4);
          border: 10px solid #fff;
          transition: transform 4s cubic-bezier(0.2, 0.8, 0.3, 1);
          transform: rotate(0deg);
          transform-origin: center center;
          overflow: hidden;
        }

        .segment-label {
          position: absolute;
          width: 50%;
          height: 50%;
          top: 0;
          left: 50%;
          transform-origin: 0% 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-left: 10px;
        }

        .segment-content {
          transform: rotate(-${segmentAngle / 2}deg);
          display: flex;
          align-items: center;
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
        }

        .number {
          font-size: 30px;
          font-weight: bold;
          margin-left: 5px;
        }
        .segment-icon {
          font-size: 24px;
        }

        .center-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 50%;
          border: 5px solid #ff4757;
          z-index: 5;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
        }

        .pointer {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 20px solid transparent;
          border-right: 20px solid transparent;
          border-top: 30px solid #ff4757;
          z-index: 10;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
        }

        .controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 25px;
        }

        .spin-button {
          padding: 18px 50px;
          font-size: 20px;
          font-weight: bold;
          background: linear-gradient(to right, #ff8a00, #da1b60);
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .spin-button:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
          background: linear-gradient(to right, #ff9500, #e84168);
        }

        .spin-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .result {
          text-align: center;
          animation: fadeIn 0.5s ease;
          background: rgba(255, 255, 255, 0.1);
          padding: 20px 30px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          margin-top: 20px;
        }

        .result h2 {
          margin-bottom: 20px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          font-size: 1.8rem;
          color: #ffeb3b;
        }

        .reset-button {
          padding: 12px 30px;
          font-size: 16px;
          font-weight: bold;
          background: linear-gradient(to right, #00b09b, #96c93d);
          color: white;
          border: none;
          border-radius: 30px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .reset-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          background: linear-gradient(to right, #00c9a7, #a8e063);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 480px) {
          .wheel-container {
            width: 300px;
            height: 300px;
          }
          .number {
            font-size: 20px;
          }
          .segment-label {
            padding-left: 5px;
          }
          .center-circle {
            width: 60px;
            height: 60px;
          }
          .spin-button {
            padding: 15px 40px;
            font-size: 18px;
          }
          h1 {
            font-size: 2rem;
          }
        }
        `}
      </style>

      <h2 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#4e2b03e5',
        textShadow: '0 0 10px #282e2dff, 0 0 20px #292f2eff',
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '15px 25px',
        borderRadius: '12px',
        backdropFilter: 'blur(6px)',
        margin: '20px 0',
        textAlign: 'center'
      }}>
        Your balance: {Math.floor(wallet)}
      </h2>

      <div className="wheel-container">
        <div
          className="wheel"
          ref={wheelRef}
          style={{ background: conicGradient }}
        >
          {segmentThemes.map((theme, index) => {
            const rotation = index * segmentAngle;
            return (
              <div
                key={index}
                className="segment-label"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <div className="segment-content">
                  <span className="segment-icon">{theme.icon}</span>
                  <span className="number">{theme.value}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pointer"></div>
        <div className="center-circle"></div>
      </div>

      <div className="controls">
        {result === null && (
          <button onClick={spinWheel} disabled={spinning} className="spin-button">
            {spinning ? 'Spinning...' : 'SPIN'}
          </button>
        )}
        {result !== null && (
          <div className="result">
            <h2>{getResultMessage(result)}</h2>
            <button onClick={resetWheel} className="reset-button">Play Again</button>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default SpinnerSelection;