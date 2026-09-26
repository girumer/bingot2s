import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Logins.css';

function Logins() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    phoneNumber: '',
  });

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataa,setadataa]=useState();
  // If token exists, redirect to Mainmenu
  useEffect(() => {
    const token = localStorage.getItem('accesstoken');
    if (token) {
      navigate('/Mainmenu');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, phoneNumber } = formData;

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${BACKEND_URL}/auth/login`,
        { username, phoneNumber },
        { withCredentials: true, timeout: 40000 }
      );

      const resData = response.data;
setadataa(response.data);
      if (resData.token) {
        localStorage.setItem('accesstoken', resData.token);
        localStorage.setItem("phoneNumber",resData.phoneNumber);
        navigate('/Mainmenu', { state: { id: username } });
      } else if (resData.message) {
        setMessage(resData.message);
        setIsLoading(false);
        //console.log(resData.message);
      } else {
        setMessage('Login failed. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setMessage('An error occurred. Please try again later.');
      setIsLoading(false);
    }
  };
//console.log(dataa);
  return (
    <div className="container">
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
         
           
          </div>

          <div className="form-group">
            
           
          </div>

          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            <button type="submit" className="submit-button">
              Login
            </button>
          )}
        </form>
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
  <span>Don't have an account? </span>
 
</div>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}

export default Logins;
