import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './dashbord.css'
import Navbaradmin from './Navbaradmin';



function Dashbord() {
//const [message,setMessage]=setMessage('');
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const location=useLocation();
const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const [username,setusername]=useState(null);
  const [tempuser,setTempuser]=useState(null);
  const [incaamount,setincaamount]=useState(0);
  const [walletbord,setwalletbord]=useState(false);
  const [showDialog, setShowDialog] = useState(false);
  //localStorage.setItem('username',location.state.id);
  
  //let  username= localStorage.getItem('username');
  axios.defaults.withCredentials=true;
  console.log(username);
  const handleChange = (event) => {
    let value = parseInt(event.target.value); // Adjust input for zero-based index

    if (!isNaN(value)) { // Ensure valid index within cartela bounds
      setincaamount(value); // Update cartes, which triggers useEffect to update winstate1
    } else {
        console.error("Invalid selection or index out of bounds");
    }
 
};
const performaction=()=>{
  setShowDialog(false);
  axios.post(`${BACKEND_URL}/updatewallete`,{tempuser,incaamount})
    .then(res=>{
      alert(res.data); // Display success message
           
    })
    .catch(err => {
      console.error("Error deleting user:", err);
      alert(err.response.data.message || "Failed to delete user");
  });
  
}
  
  const handledepoClick=()=>{
    setwalletbord(false);
    setShowDialog(true);
  }
  const handleDeleteIconClick = (username) => {
    //console.log('Delete icon clicked for user:', user);
   axios.post(`${BACKEND_URL}/deleteuser`,{username})
    .then(res=>{
      alert(res.data.message); // Display success message
            setMessage("User deleted successfully!");
    })
    .catch(err => {
      console.error("Error deleting user:", err);
      alert(err.response.data.message || "Failed to delete user");
  });
    // Your logic to delete the user
  };
  const handleIncconClick =(user) => {
    //console.log('Delete icon clicked for user:', user);
    setTempuser(user);
    setwalletbord(true);
  };
  const handlechangeIconClick=(user)=>{
    navigate("/AdminPasswordReset",{ state: { username: user} });
  }
  useEffect(() => {
    const checkToken = async () => {
      const token = await localStorage.getItem('accesstoken');
      
      if (!token) {
        // If there's no token, navigate to the login page
        navigate("/");
      } else {
        try {
          // Make API call to verify user
          const res = await axios.post(`${BACKEND_URL}/useracess`, {}, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          const username = res.data.username;
          setusername(username);  // Assuming you have a state for `setUser`
        } catch (err) {
          console.error("Error:", err);
          alert("Failed to verify user");
        }
      }
    };

    checkToken();  // Call the function to check the token and make the API call
  }, [navigate]);
  
  useEffect(() => {
    console.log("useEffect is running");
    const token =  localStorage.getItem('accesstoken');
    axios
      .get(`${BACKEND_URL}/api/dashboards`,{
        headers: {
            Authorization: `Bearer ${token}`,
        },})
      .then(res => {
        if (res.data.valid) {
          setUsers(res.data.user);
          console.log("User data is", res.data.user);
        } else {
          navigate("/logins");
        }
      })
      .catch(err => console.log(err));
  }, []);// Dependencies: re-run if token or navigate changes
 console.log("users are",users);
  return (
    <React.Fragment>
           
                        <Navbaradmin />
    <div className="game-history-container">
      <h2>Dear {username} here is your </h2>
      <table className="game-history-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>role</th>
            <th>remaing acc</th>
            <th>wallet increment</th>
            <th>delete</th>
            
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user) => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.Wallet}</td>
                <td>
              <i
        className="fa-solid fa-plus"
        style={{ cursor: 'pointer', color: 'black' }}
        onClick={() => handleIncconClick (user.username)}
              > add</i>
             
         </td>
         <td> <i
        className="fa-solid fa-trash"
        style={{ cursor: 'pointer', color: 'red' }}
        onClick={() => handleDeleteIconClick(user.username)}
      > delete</i></td>
      
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2">No users found</td>
            </tr>
          )}
        </tbody>
      </table>
      {walletbord && (
                        <div className="popup" id="bingoPopup">
                            <div className="popup-content">
                                <div className='claim'>
                                    <p>Enter the amount you want to increase </p>
                                </div>
                                <div className='claiminput'>
                                    <input type='number' 
                                     onChange={handleChange}
                                    />
                                </div>
                                <div className='Cheack'>
                                    <button onClick={() => handledepoClick()}>increase</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showDialog && (
       <div className="dialog-overlay">
      <div className="dialog-box">
        <h3>Are you sure?</h3>
        <p>Do you want to perform this action?</p>
        <div className="dialog-buttons">
          <button className="btn btn-yes"  onClick={() => performaction()}>
            Yes
          </button>
          <button className="btn btn-no" >
            No
          </button>
        </div>
      </div>
    </div>)
}
    </div>
    </React.Fragment>
  );
}

export default Dashbord;
