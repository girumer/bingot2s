import React, { useState } from "react";
import axios from "axios";

export default function DepositPage() {
  const [inputText, setInputText] = useState(""); // can be transaction ID or full message
  const [message, setMessage] = useState("");
  const loggedInUserPhone = localStorage.getItem("phoneNumber");

  const handleDeposit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!loggedInUserPhone) {
      setMessage("User phone number not found. Please login again.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/deposit", {
        message: inputText, // send message or transaction number
        phoneNumber: loggedInUserPhone,
      });

      setMessage(res.data.message || "Deposit successful");
      setInputText("");
    } catch (err) {
      setMessage(err.response?.data?.error || "Error processing deposit");
    }
  };

  return (
    <div>
      <h2>Claim Deposit</h2>
      <form onSubmit={handleDeposit}>
        <textarea
          placeholder="Paste your transaction message or enter Transaction ID"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={6}
          required
          style={{ width: "100%", padding: "10px" }}
        />
        <button type="submit">Claim</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
