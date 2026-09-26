import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './Report.css';
import moment from 'moment';
const Report = () => {
  const [dailyReport, setDailyReport] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem('accesstoken');

  // Verify user access on component mount
  useEffect(() => {
    if (!token) {
      navigate("/");
    } else {
      axios.post(`${BACKEND_URL}/useracess`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setUser(res.data.username);
      })
      .catch((err) => {
        console.error("Error verifying user access:", err);
        alert("Failed to verify user");
        navigate("/");
      });
    }
  }, [token, BACKEND_URL, navigate]);

  // Fetch the report data
 useEffect(() => {
  const fetchReportData = async () => {
    if (!token || !user) return; // Make sure we have token and user before making the request
    
    try {
      // Send user as a query parameter and token in the Authorization header
      const response = await axios.get(`${BACKEND_URL}/api/getReportData`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { user: user },  // Send user as query parameter
      });

  // Ensure that dailyReport is always an array
  //setDailyReport(Array.isArray(response.data.daily) ? response.data.daily : []);
  setWeeklyReport(Array.isArray(response.data.weekly) ? response.data.weekly : [response.data.weekly]);
  setMonthlyReport(Array.isArray(response.data.monthly) ? response.data.monthly : [response.data.monthly]);
  setDailyReport(Array.isArray(response.data.daily) ? response.data.daily : [response.data.daily]);

 // console.log("dily rep is ",response.data.daily )
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchReportData();
}, [token, user]);  // Only re-fetch when token or user changes


  if (loading) {
    return <div>Loading reports...</div>;
  }

  return (
    <React.Fragment>
      <Navbar />
    <div className="report-container">
      <h2>Game Reports</h2>

      {/* Daily Report Table */}
      <div className="report-table">
        <h3>Daily Report</h3>
        <table>
          <thead>
            <tr>
               <th>daily</th>
              <th>startDate</th>
              <th>endDate</th>
             <th>Total Profit</th>
              <th>Total Games Played</th>
            </tr>
          </thead>
          <tbody>
            {dailyReport.map((report, index) => (
              <tr key={index}>
                 <td>{report.period}</td>
                <td>{moment(report.startDate).format('MMMM Do YYYY')}</td>
                <td>{moment(report.endDate).format('MMMM Do YYYY')}</td>
                <td>{report.totalProfit}</td>
                <td>{report.totalGames}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Weekly Report Table */}
      <div className="report-table">
        <h3>Weekly Report</h3>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>startDate</th>
              <th>endDate</th>
              <th>Total Profit</th>
              <th>Total Games Played</th>
            </tr>
          </thead>
          <tbody>
            {weeklyReport.map((report, index) => (
              <tr key={index}>
                <td>{report.period}</td>
                <td>{moment(report.startDate).format('MMMM Do YYYY')}</td>
                <td>{moment(report.endDate).format('MMMM Do YYYY')}</td>
                <td>{report.totalProfit}</td>
                <td>{report.totalGames}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Report Table */}
      <div className="report-table">
        <h3>Monthly Report</h3>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>startDate</th>
              <th>endDate</th>
              <th>Total Profit</th>
              <th>Total Games Played</th>
            </tr>
          </thead>
          <tbody>
            {monthlyReport.map((report, index) => (
              <tr key={index}>
                 <td>{report.period}</td>
              <td>{moment(report.startDate).format('MMMM Do YYYY')}</td>
                <td>{moment(report.endDate).format('MMMM Do YYYY')}</td>
               <td>{report.totalProfit}</td>
                <td>{report.totalGames}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
   </React.Fragment>
  );
};

export default Report;
