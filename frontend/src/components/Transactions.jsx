// src/pages/Transactions.js
import React, { useEffect, useState } from "react";
import axios from "axios";

function Transactions({ username }) {
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");

  // Load transaction history
  useEffect(() => {
    axios.get(`/api/transactions/history/${username}`)
      .then(res => setTransactions(res.data))
      .catch(err => console.error(err));
  }, [username]);

  // Deposit
  const handleDeposit = async (method) => {
    await axios.post("/api/transactions/deposit", {
      username,
      amount: Number(amount),
      method
    });
    window.location.reload();
  };

  // Withdraw
  const handleWithdraw = async (method) => {
    await axios.post("/api/transactions/withdraw", {
      username,
      amount: Number(amount),
      method
    });
    window.location.reload();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Wallet Transactions</h2>
      <input
        type="number"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div style={{ margin: "10px 0" }}>
        <button onClick={() => handleDeposit("telebirr")}>Deposit with Telebirr</button>
        <button onClick={() => handleDeposit("cbebirr")}>Deposit with CBE Birr</button>
      </div>

      <div>
        <button onClick={() => handleWithdraw("telebirr")}>Withdraw to Telebirr</button>
        <button onClick={() => handleWithdraw("cbebirr")}>Withdraw to CBE Birr</button>
      </div>

      <h3>Transaction History</h3>
      <ul>
        {transactions.map((tx, i) => (
          <li key={i}>
            {tx.type} | {tx.amount} | {tx.method} | {tx.status} |{" "}
            {new Date(tx.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Transactions;
