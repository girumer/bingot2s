import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


function AdminLogin() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {const response = await axios.post(`${BACKEND_URL}/admin/login`, formData, {
  headers: { "Content-Type": "application/json" }
});

   
      if (response.data.token) {
        localStorage.setItem('admintoken', response.data.token);
        console.log(response.data.token);
        navigate('/AdminDashboard');
      } else {
        setMessage(response.data.message);
      }
    } catch (err) {
      console.error(err);
      setMessage('Login failed');
    }
  };

  return (
    <div className="admin-login-container">
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Username" onChange={handleInputChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleInputChange} required />
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default AdminLogin;
