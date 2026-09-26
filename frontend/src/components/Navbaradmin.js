import { useRef } from 'react';
import axios from "axios";
import { FaBars, FaTimes } from 'react-icons/fa';
import React from 'react';
import { useState } from 'react';
import '../components/Nav.css';
import Cookies from "js-cookie";
import {useLocation, useNavigate} from 'react-router-dom';
import { useEffect } from 'react';


function Navbaradmin() {
    const token=localStorage.getItem('accesstoken');
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navRef = useRef();
const location=useLocation();
const history=useNavigate();
const handlelogout=()=>{
    localStorage.removeItem('accesstoken');
    history("/logins");
   }
   const showNavBar = () => {
    navRef.current.classList.toggle('responsive_nav');
  };
  const gotosignup=()=>{
    history("/signups") 
  }
  const gotohelp=()=>{
    history("/AdminPasswordReset") 
  }
  const gotogame=()=>{
    history("/StackPage") 
  }
  const gotohome=()=>{
 
      history("/BingoBoard")
    
    
  }
  const gotohistory=()=>{
    history("/GameHistory")
  }
   const gototransfer=()=>{
    history("/Mainmenu")
  }
 ///console.log("the admin board token is",token);
  return (
    <header>
      <nav ref={navRef}>
      <button className="Home" aria-label="House User" onClick={gotohome}>
  <i className="fa-solid fa-house-user" onClick={gotohome}></i> {/* House User Icon */}
 Active user
</button>
          <button className="selectcartela" aria-label="Trophy" onClick={gotosignup}>
  <i className="fa-solid fa-table" onClick={gotosignup}></i> {/* Trophy Icon */}
    Regster user
             </button>


        <button className="help" aria-label="Help" onClick={gotohelp}>
       <i className="fa-solid fa-question-circle" onClick={gotohelp}></i> {/* Question Circle Icon */}
                             change Password
                   </button>
        <button className="nav-btn1 nav-close-btn" onClick={showNavBar}>
          <FaTimes />
        </button>
      {token?(<button onClick={handlelogout}>LogOut</button>):<button>login</button>}  
      </nav>
      
      <button className="nav-btn1" onClick={showNavBar}>
        <FaBars />
      </button>
     
    </header>
  );
}

export default Navbaradmin