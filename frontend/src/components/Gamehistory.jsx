import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './GameHistory.css';
import Navbar from '../components/Navbar';
import moment from 'moment';
import ReactPaginate from 'react-paginate';

const GameHistory = () => {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);

  const rowsPerPage = 10;

  // Verify user
  useEffect(() => {
    const token = localStorage.getItem('accesstoken');
    if (!token) {
      navigate('/');
      return;
    }

    axios.post(`${BACKEND_URL}/useracess`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setUser(res.data.username))
    .catch(err => {
      console.error("User verification failed:", err);
      navigate('/');
    });
  }, [navigate, BACKEND_URL]);

  // Fetch game history
  useEffect(() => {
  if (!user) return;

  const fetchGameHistory = async () => {
    try {
      const token = localStorage.getItem('accesstoken');
      const response = await axios.post(
        `${BACKEND_URL}/api/gameHistory/getHistory`,
        { user },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // <-- replace this line
      setGameHistory(
        (response.data.gameHistory || []).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )
      );
    } catch (err) {
      console.error("Error fetching game history:", err);
      setError('Error fetching game history');
    } finally {
      setLoading(false);
    }
  };

  fetchGameHistory();
}, [user, BACKEND_URL]);


  const pageCount = Math.ceil(gameHistory.length / rowsPerPage);
  const indexOfLastPage = (currentPage + 1) * rowsPerPage;
  const indexOfFirstPage = indexOfLastPage - rowsPerPage;
  const currentPosts = gameHistory.slice(indexOfFirstPage, indexOfLastPage);

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  if (loading) return <div>Loading game history...</div>;
  if (error) return <div>{error}</div>;

  return (
    <React.Fragment>
      <Navbar />
      {user ? (
        <div className="game-history-container">
          <h2>Dear {user}, here is your Game History</h2>
          <table className="game-history-table">
            <thead>
              <tr>
                <th>Time</th>
               
                <th>Stake</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {currentPosts.length > 0 ? (
                currentPosts.map((game, index) => (
                  <tr key={index}>
                    <td>{moment(game.timestamp).format('MMMM Do YYYY, h:mm:ss a')}</td>
                    
                    <td>{game.roomId}</td>
                    <td style={{ color: game.outcome === 'win' ? 'green' : 'red', fontWeight: 'bold' }}>
  {game.outcome}
</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No games played yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          {pageCount > 1 && (
            <ReactPaginate
              pageCount={pageCount}
              onPageChange={handlePageClick}
              containerClassName={'pagination'}
              activeClassName={'active'}
              previousLabel={'Previous'}
              nextLabel={'Next'}
            />
          )}
        </div>
      ) : (
        <h1>Please login</h1>
      )}
    </React.Fragment>
  );
};

export default GameHistory;
