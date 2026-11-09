import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./WalletPage.css";
import Navbar from "./Navbar";

function WalletPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("telebirr");
  const [wallet, setWallet] = useState(0);
  const [coins, setCoins] = useState(0);
  const [username, setUser] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // --- Get username from token ---
  useEffect(() => {
    const token = localStorage.getItem("accesstoken");
    if (!token) return alert("User not found");

    axios
      .post(`${BACKEND_URL}/useracess`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data.username))
      .catch(err => {
        console.error(err);
        alert("Failed to verify user");
      });
  }, [BACKEND_URL]);

  // --- Fetch wallet and coins ---
  useEffect(() => {
    if (!username) return;

    const fetchWalletAndCoins = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/wallet/${username}`);
        setWallet(res.data.Wallet);
        setCoins(res.data.coins);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch wallet and coins");
      }
    };

    fetchWalletAndCoins();
  }, [username, BACKEND_URL]);

  // --- Deposit ---
  const handleDeposit = async () => {
    if (!amount || amount <= 0) return alert("Enter a valid amount");

    try {
      const res = await axios.post(`${BACKEND_URL}/api/transactions/deposit`, {
        username,
        amount: Number(amount),
        method,
      });
      setWallet(res.data.wallet);
      setAmount("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Deposit failed");
    }
  };

  // --- Withdraw ---
  const handleWithdraw = async () => {
    if (!amount || amount <= 0) return alert("Enter a valid amount");

    try {
      const res = await axios.post(`${BACKEND_URL}/api/transactions/withdraw`, {
        username,
        amount: Number(amount),
        method,
      });
      setWallet(res.data.wallet);
      setAmount("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Withdrawal failed");
    }
  };

  // --- Convert coins to wallet ---
  const handleConvertCoins = async () => {
    if (!username) return;
    if (coins < 20) return alert("You need at least 20 coins to convert");

    const walletIncrement = Math.floor(coins / 20);
    const remainingCoins = coins % 20;

    try {
      await axios.post(`${BACKEND_URL}/api/wallet/convertCoins`, {
        username,
        walletIncrement,
        remainingCoins,
      });

      setWallet(prev => prev + walletIncrement);
      setCoins(remainingCoins);

      alert(`Converted ${walletIncrement * 20} coins to ${walletIncrement} Wallet`);
    } catch (err) {
      console.error(err);
      alert("Conversion failed");
    }
  };

  return (
    <React.Fragment>
      {/* --- Navbar --- */}
      <Navbar />

      <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
        
        {/* --- Back to Game Menu Button --- */}
        <button
          onClick={() => navigate("/mainmenu")}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Back to Game Menu
        </button>

        <h2>Wallet: {wallet} ETB</h2>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />

        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        >
          <option value="telebirr">Telebirr</option>
          <option value="cbebirr">CBE Birr</option>
        </select>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <button onClick={handleDeposit} style={{ width: "48%", padding: "10px" }}>Deposit</button>
          <button onClick={handleWithdraw} style={{ width: "48%", padding: "10px" }}>Withdraw</button>
        </div>

        {/* --- Coin Component --- */}
        <div style={{ marginTop: "20px" }}>
          <h3>Coins: {coins}</h3>
          <button
            onClick={handleConvertCoins}
            style={{ width: "100%", padding: "10px", marginTop: "5px" }}
          >
            Convert Coins to Wallet
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

export default WalletPage;
