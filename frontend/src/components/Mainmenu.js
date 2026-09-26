// src/pages/Mainmenu.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import socket from "../socket";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay } from "@fortawesome/free-solid-svg-icons";
import "./Maninmenu.css";

function Mainmenu() {
  const history = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [wallet, setWallet] = useState(0);
  const [username, setUser] = useState(null);
   const [message,setMessage]=useState("");
  const [phoneNumber, setPhoneNumber] = useState(null);
  const loggedInUserPhone = localStorage.getItem("phoneNumber");
 useEffect(() => {
  const token = localStorage.getItem("accesstoken");
  if (!token) return alert("No token found. Please login.");

  axios.post(`${BACKEND_URL}/useracess`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  })
  .then(res => {
    const { username, phoneNumber } = res.data;
    setMessage(res.data);
    //localStorage.setItem("phoneNumber", phoneNumber);
   
    setUser(username);
    setPhoneNumber(phoneNumber);
    checkpoint(username);
  })
  .catch(err => {
    console.error(err.response?.data || err);
    alert("Failed to verify user. Please login again.");
  });
}, []);
 //console.log("user name1 2",loggedInUserPhone );
//console.log("phone number is",phoneNumber)
 const checkpoint = async (username) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/depositcheckB`, { username });
      setWallet(res.data.balance);
    } catch (err) {
      console.error(err);
      alert("Error loading wallet");
    }
  };
  

  const joinRoom = (roomId) => {
    if (!username) return alert("Please login first!");
    history(`/CartelaSelction`, { state: { roomId: String(roomId), username, stake: Number(roomId) } });
  };

  const navigateToDeposit = () => {
    const loggedInUserPhone = localStorage.getItem("phoneNumber"); 
    history("/wallet", { state: { phoneNumber: loggedInUserPhone } });
  };
   const ToDeposit=()=>{
        
     if (!loggedInUserPhone) return alert("Phone number not found. Please login again.");
    history("/deposit");
   }
  // Table data
  const roomsData = [
    { stake: 10, status: "Starting", prize: 800 },
    { stake: 20, status: "Starting", prize: 1600 },
    { stake: 30, status: "Starting", prize: 3200 },
    { stake: 40, status: "Starting", prize: 6800 },
    { stake: 50, status: "Starting", prize: 9000 },
  ];

  return (
    <React.Fragment>
      <Navbar/>

      {/* Top button bar */}
      <div className="top-button-bar">
        <button className="top-btn deposit-btn" onClick={navigateToDeposit}>
          💳 Witdraw
        </button>
        <button className="top-btn deposit-btn" onClick={ToDeposit}>
          ➕ Deposit
        </button>
        <button className="top-btn wallet-btn" disabled>
          💰 Wallet: {wallet}
        </button>
      </div>

      <div className="play-page">
        <h1 className="welcome-text">🎮 Select a Room</h1>

        {/* Rooms table */}
        <table className="rooms-table">
          <thead>
            <tr>
              <th>Stake</th>
              <th>Game Status</th>
              <th>Possible win</th>
              <th>Join</th>
            </tr>
          </thead>
          <tbody>
            {roomsData.map((room) => (
              <tr key={room.stake}>
                <td>{room.stake}</td>
                <td>{room.status}</td>
                <td>{room.prize}</td>
                <td>
                  <button className="play-btn" onClick={() => joinRoom(room.stake)}>
                    <FontAwesomeIcon icon={faPlay} className="play-icon" />
                    <span> Join</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

export default Mainmenu;
