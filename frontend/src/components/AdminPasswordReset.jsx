// AdminPasswordReset.js

import axios from "axios";
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
const AdminPasswordReset = () => {
  const location=useLocation();
    const navigate=useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [formData, setFormData] = useState({
    customerId: "",
    newPassword: "",
  });
  const [responseMessage, setResponseMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    // Save the username to localStorage on component mount
    if (location?.state?.username) {
      localStorage.setItem("user", location.state.username);
    }
    // Retrieve username from localStorage
    const user = localStorage.getItem("user");
    if (user) {
      setFormData((prevData) => ({
        ...prevData,
        customerId: user, // Set it as the initial value for customerId
      }));
    }
  }, [location]);
  const token = localStorage.getItem('accesstoken');
       // console.log("token is ",token);
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponseMessage("");
    setErrorMessage("");

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/reset-password`,
        formData,
        {headers: {
          Authorization: `Bearer ${token}`,
        },} // Ensure cookies are sent
      );

      setResponseMessage(response.data.message);
    } catch (error) {
      const message = error.response?.data?.message || "An error occurred";
      setErrorMessage(message);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Password Reset</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Customer ID:
          <input
            type="text"
            name="customerId"
            value={formData.customerId}
            onChange={handleInputChange}
            style={styles.input}
            required
          />
        </label>
        <label style={styles.label}>
          New Password:
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleInputChange}
            style={styles.input}
            required
          />
        </label>
        <button type="submit" style={styles.button}>
          Reset Password
        </button>
      </form>
      {responseMessage && <p style={styles.success}>{responseMessage}</p>}
      {errorMessage && <p style={styles.error}>{errorMessage}</p>}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "0 auto",
    padding: "20px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  input: {
    width: "100%",
    padding: "10px",
    margin: "5px 0",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  success: {
    color: "green",
  },
  error: {
    color: "red",
  },
};

export default AdminPasswordReset;
