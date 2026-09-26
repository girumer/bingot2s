import React from 'react';
import { useState,useContext, } from 'react';
import { Numbercontext } from '../helper/Numbercontext';
import cartela from './cartela.json';
import './Winnerboard.css';
function Winnerboard() {
    const {cartes,setcart}=useContext(Numbercontext);
    let carteno=cartes+1;
    let intialstate=cartela[cartes].cart;
    const carts=intialstate.map((row,index)=>(
        row.map((cell,cellindex)=>(
          <button className="boxes"  key={cellindex} 

        >{cell}</button>
        
        )
      )))
     
    
  return (
    <div className="carteladisp">
    <div className="winerdisp">
         <h5> You Win by cartela number {carteno}</h5>
         </div>
<div className="playCartela1">
    
        
        {carts }
   
   
    </div>
    </div>
  )
}

export default Winnerboard