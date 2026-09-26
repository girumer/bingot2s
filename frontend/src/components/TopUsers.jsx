import React, { useEffect, useState } from "react";
import axios from "axios";

const TopUsers = () => {
  const [topUsers, setTopUsers] = useState([]);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/leaderboard/top`);
        setTopUsers(res.data);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      }
    };
    fetchTopUsers();
  }, []);

  const getMedal = (rank) => {
    switch (rank) {
      case 0: return "🥇"; // Gold
      case 1: return "🥈"; // Silver
      case 2: return "🥉"; // Bronze
      default: return `#${rank + 1}`; // Normal rank
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>🏆 Top 5 Users by Coins</h2>
      <ul style={styles.list}>
        {topUsers.map((user, index) => (
          <li key={index} style={styles.item}>
            <span style={styles.rank}>{getMedal(index)}</span>
            <span style={styles.username}>{user.username}</span>
            <span style={styles.coins}>{user.coins} coins</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Inline styles
const styles = {
  container: {
    maxWidth: "400px",
    margin: "20px auto",
    padding: "20px",
    borderRadius: "12px",
    backgroundColor: "#f9f9f9",
    boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    textAlign: "center",
    marginBottom: "15px",
    color: "#333",
  },
  list: {
    listStyle: "none",
    padding: 0,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    marginBottom: "8px",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.05)",
  },
  rank: {
    fontSize: "20px",
    fontWeight: "bold",
    marginRight: "10px",
  },
  username: {
    flex: 1,
    fontWeight: "500",
    color: "#444",
  },
  coins: {
    fontWeight: "bold",
    color: "#2c7be5",
  },
};

export default TopUsers;
