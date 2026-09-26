import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Signups.css';

function Signups() {
  axios.defaults.withCredentials = true;
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { username, phoneNumber } = formData;

    if (!username || !phoneNumber) {
      alert("Please fill in all required fields!");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${BACKEND_URL}/auth/register`,
        {
          username,
          phoneNumber,
        },
        { withCredentials: true }
      );

      if (res.data.message === "User registered successfully") {
        navigate('/Mainmenu', { state: { username: username } });
      } else {
        alert(res.data.message || "Registration completed, but there was an unexpected response.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message);
      } else {
        alert("Network error. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <h2>Create Your Account</h2>
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              value={formData.username} 
              onChange={handleInputChange} 
              required 
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input 
              type="tel" 
              id="phoneNumber" 
              name="phoneNumber" 
              value={formData.phoneNumber} 
              onChange={handleInputChange} 
              required 
              placeholder="Enter your phone number"
            />
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="login-redirect">
          Already have an account? <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  );
}

export default Signups;