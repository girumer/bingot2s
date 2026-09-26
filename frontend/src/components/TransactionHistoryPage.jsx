import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TransactionHistoryPage.css"; // your CSS file

function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [username, setUser] = useState(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Get username from token
  useEffect(() => {
    const token = localStorage.getItem("accesstoken");
    if (!token) return alert("User not found");

    axios
      .post(`${BACKEND_URL}/useracess`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUser(res.data.username))
      .catch((err) => {
        console.error(err);
        alert("Failed to verify user");
      });
  }, [BACKEND_URL]);

  // Fetch history when username is available
  useEffect(() => {
    if (!username) return;

    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/transactions/history/${username}`);
        setTransactions(res.data);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch transactions");
      }
    };

    fetchHistory();
  }, [username, BACKEND_URL]);

  return (
    <div className="transaction-container">
      <h2>Transaction History</h2>
      {transactions.length === 0 ? (
        <p className="transaction-empty">No transactions found.</p>
      ) : (
        <ul className="transaction-list">
          {transactions.map((tx) => (
            <li
              key={tx._id}
              className={`transaction-item ${tx.type === "withdraw" ? "withdraw" : ""}`}
            >
              <strong>{tx.type.toUpperCase()}</strong> - {tx.amount} ETB<br />
              via <strong>{tx.method}</strong> ({tx.status})<br />
              <small>{new Date(tx.timestamp).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TransactionHistoryPage;
