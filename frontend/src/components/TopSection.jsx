import React from "react";

// --- Helper functions ---
function getBingoLetter(num) {
  if (num >= 1 && num <= 15) return "B";
  if (num >= 16 && num <= 30) return "I";
  if (num >= 31 && num <= 45) return "N";
  if (num >= 46 && num <= 60) return "G";
  if (num >= 61 && num <= 75) return "O";
  return "";
}

function getBingoClass(num) {
  const letter = getBingoLetter(num);
  return letter.toLowerCase(); // b, i, n, g, o
}

// --- Component ---
function TopSection({ totalAward, totalPlayers, timer, lastNumber, lastFive = [] }) {
  return (
    <div className="top-section">
      {/* Stats */}
      <div className="stats">
        <div className="stat-item">💰 Prize: {totalAward ?? "Loading..."} ETB</div>
        <div className="stat-item">👥 Players: {totalPlayers}</div>
        {timer !== null && <div className="stat-item">⏳ {timer}s</div>}
      </div>

      {/* Last numbers */}
      <div className="last-numbers">
        {lastNumber && (
          <div className={`called-number ${getBingoClass(lastNumber)}`}>
            {getBingoLetter(lastNumber)}-{lastNumber}
          </div>
        )}
        <div className="last-five">
          {Array.isArray(lastFive) &&
            lastFive.map((num, i) => (
              <span key={i} className={`called-number ${getBingoClass(num)}`}>
                {getBingoLetter(num)}-{num}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

export default TopSection;
