import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

// Inside the component

const LIMIT = 10;

export default function AdminDashboard() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  const token = localStorage.getItem("admintoken");
  const [transactions, setTransactions] = useState([]);
  const [transactionlist,settransactionlist]=useState([]);
 const [pendingWithdrawals, setPendingWithdrawals] = useState([]); 
 const [depositls,setdepositls]=useState([]);
 const [methods,setmethods]=useState(0);
const [withdrawalPage, setWithdrawalPage] = useState(1);
const [depositPage, setDepositPage] = useState(1);
const itemsPerPage = 5;
const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [summary, setSummary] = useState({
    totalDeposit: 0,
    totalWithdraw: 0,
   
  });

  const [users, setUsers] = useState([]);
  const [totalClients, setTotalClients] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [form, setForm] = useState({
    username: "",
    phoneNumber: "",
    role: "client",
    password: "",
  });
  const [formMsg, setFormMsg] = useState("");

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchSummary = async () => {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/admin/transactions`, { headers: authHeader });
    
    // Handle different response structures
    const transactionsArray = Array.isArray(data) ? data : (data.transactions || []);
    
    setSummary({
      totalDeposit: data?.totalDeposit ?? 0,
      totalWithdraw: data?.totalWithdraw ?? 0,
     
    });
    
    // Also set transactions if needed, or keep separate call
    setTransactions(transactionsArray);
  } catch (err) { 
    console.error(err);
    setTransactions([]); // Set empty array on error
  }
};
 const fetchPendingWithdrawals = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/admin/pending-withdrawals`, { 
        headers: authHeader 
      });
      setPendingWithdrawals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching pending withdrawals", err);
      setPendingWithdrawals([]);
    }
  };
   const updateWithdrawalStatus = async (id) => {
    try {
      await axios.post(
        `${BACKEND_URL}/admin/confirm-withdrawal`,
        { withdrawalId: id },
        { headers: authHeader }
      );
      
      // Refresh the pending withdrawals list
      await fetchPendingWithdrawals();
      // Also refresh the summary and transaction list
      await Promise.all([fetchSummary(), fetchtransaction()]);
      
   //   alert(`Withdrawal ${status === 'confirmed' ? 'confirmed' : 'rejected'} successfully`);
    } catch (err) {
      console.error("Error updating withdrawal status", err);
      alert(err.response?.data?.message || "Failed to update withdrawal status");
    }
  };
   const updatedepoStatus = async (id) => {
    try {
      await axios.post(
        `${BACKEND_URL}/admin/confirm-depo`,
        { depositId: id },
        { headers: authHeader }
      );
      
      // Refresh the pending withdrawals list
      await fetchdeposit()();
      // Also refresh the summary and transaction list
      await Promise.all([fetchSummary(), fetchtransaction()]);
      
   //   alert(`Withdrawal ${status === 'confirmed' ? 'confirmed' : 'rejected'} successfully`);
    } catch (err) {
      console.error("Error updating withdrawal status", err);
    
    }
  };
const fetchdeposit = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/admin/deposit`, { 
        headers: authHeader 
      });
      setdepositls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching pending withdrawals", err);
      setdepositls([]);
    }
  };
const fetchtransaction=async () => {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/admin/transactions-list`, { headers: authHeader });
    
    // Handle different response structures
    const transactionsArray = Array.isArray(data) ? data : (data.transactions || []);
    
    
    
    // Also set transactions if needed, or keep separate call
    settransactionlist(transactionsArray);
  } catch (err) { 
    settransactionlist([]); // Set empty array on error
  }
};
const fetchUsers = async (p = 1) => {
  try {
    const { data } = await axios.get(
      `${BACKEND_URL}/admin/users?page=${p}&limit=${LIMIT}`,
      { headers: authHeader }
    );

    setUsers(Array.isArray(data.users) ? data.users : []);
    setTotalClients(data.totalUsers ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setPage(data.currentPage ?? p);
  } catch (err) {
    console.error(err);
    setUsers([]);
    setTotalClients(0);
  }
};

// Withdrawals pagination
const indexOfLastWithdrawal = withdrawalPage * itemsPerPage;
const indexOfFirstWithdrawal = indexOfLastWithdrawal - itemsPerPage;
const currentWithdrawals = pendingWithdrawals.slice(indexOfFirstWithdrawal, indexOfLastWithdrawal);
const withdrawalTotalPages = Math.ceil(pendingWithdrawals.length / itemsPerPage);

// Deposits pagination
const indexOfLastDeposit = depositPage * itemsPerPage;
const indexOfFirstDeposit = indexOfLastDeposit - itemsPerPage;
const currentDeposits = depositls.slice(indexOfFirstDeposit, indexOfLastDeposit);
const depositTotalPages = Math.ceil(depositls.length / itemsPerPage);


  const loadAll = async (p = 1) => {
    setLoading(true); setErrMsg("");
    await Promise.all([fetchSummary(), fetchUsers(p),fetchtransaction(),fetchdeposit(),fetchPendingWithdrawals()]);
    setLoading(false);
  };


useEffect(() => {
  axios.get(`${BACKEND_URL}/admin/transactions-list`, { headers: authHeader })
    .then(res => {
      // Check if response contains transactions array or use empty array
      const transactionsData = Array.isArray(res.data) 
        ? res.data 
        : Array.isArray(res.data.transactions) 
          ? res.data.transactions 
          : [];
      setTransactions(transactionsData);
    })
    .catch(err => {
      console.error("Error fetching transactions", err);
      setTransactions([]); // Set empty array on error
    });
}, []);
  useEffect(() => { loadAll(page); }, []);

  const onChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); };

  const onRegister = async (e) => {
    e.preventDefault(); setFormMsg("");
    try {
      const payload = form.role === "admin" ? form : { username: form.username, phoneNumber: form.phoneNumber, role: "client" };
      const { data } = await axios.post(`${BACKEND_URL}/admin/register-user`, payload, { headers: authHeader });
      setFormMsg(data?.message || "User registered");
      setForm({ username: "", phoneNumber: "", role: "client", password: "" });
      await Promise.all([fetchUsers(page), fetchSummary()]);
    } catch (err) { console.error(err); setFormMsg(err?.response?.data?.message || "Registration error"); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try { await axios.delete(`${BACKEND_URL}/admin/delete-user/${id}`, { headers: authHeader }); await Promise.all([fetchUsers(page), fetchSummary()]); } 
    catch (err) { console.error(err); alert(err?.response?.data?.message || "Delete failed"); }
  };

  const gotoPage = async (p) => { if (p < 1 || p > totalPages) return; await fetchUsers(p); };
const handleLogout = () => {
  localStorage.removeItem("admintoken"); // remove admin token
  navigate("/Logins"); // redirect to login page
};
const handlebrodcstat=async ()=>{
   const { data } = await axios.post(
      `${BACKEND_URL}/admin/brodcast`,
      {},
      { headers: authHeader }
    );

}
  if (loading) return <div className="admin-container">Loading…</div>;
  if (errMsg) return <div className="admin-container" style={{ color: "red" }}>{errMsg}</div>;

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>
<div className="admin-header">
  <h1>Admin Dashboard</h1>
  <button className="logout-btn" onClick={handleLogout}>Logout</button>
    <button className="logout-btn" onClick={handlebrodcstat}>brodcast</button>
</div>
      {/* Summary */}
      <section className="summary-grid">
        <div className="summary-card">
          <div className="label">Total Deposits</div>
          <div className="value">{summary.totalDeposit}</div>
        </div>
        <div className="summary-card">
          <div className="label">Total Withdrawals</div>
          <div className="value">{summary.totalWithdraw}</div>
        </div>
       
        <div className="summary-card">
          <div className="label">Total Clients</div>
          <div className="value">{totalClients}</div>
        </div>
      </section>

      {/* Registration */}
      <section>
        <h2>Register User</h2>
        <form className="register-form" onSubmit={onRegister}>
          <input name="username" placeholder="Username" value={form.username} onChange={onChange} required />
          <input name="phoneNumber" placeholder="Phone Number" value={form.phoneNumber} onChange={onChange} required />
          <select name="role" value={form.role} onChange={onChange}>
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>
          {form.role === "admin" && <input name="password" type="password" placeholder="Admin Password" value={form.password} onChange={onChange} required />}
          <button type="submit">Register</button>
        </form>
        {formMsg && <p>{formMsg}</p>}
      </section>

      {/* Users table */}
      <section>
        <h2>Users</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Phone Number</th>
                <th>Role</th>
                <th>Wallet</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((u) => (
                <tr key={u._id}>
                  <td>{u.username}</td>
                  <td>{u.phoneNumber}</td>
                  <td>{u.role}</td>
                  <td>{u.Wallet}</td>
                  <td><button className="delete-btn" onClick={() => onDelete(u._id)}>Delete</button></td>
                </tr>
              )) : (
                <tr><td colSpan="5" style={{ textAlign: "center" }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {/* Pagination */}
<div className="pagination">
  <button disabled={page <= 1} onClick={() => gotoPage(page - 1)}>Prev</button>

  {/* Always show first page */}
  {page > 3 && (
    <>
      <button onClick={() => gotoPage(1)}>1</button>
      {page > 4 && <span>...</span>}
    </>
  )}

  {/* Show nearby pages */}
  {Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p >= page - 2 && p <= page + 2)
    .map(p => (
      <button
        key={p}
        onClick={() => gotoPage(p)}
        style={{ fontWeight: page === p ? "bold" : "normal" }}
      >
        {p}
      </button>
    ))}

  {/* Always show last page */}
  {page < totalPages - 2 && (
    <>
      {page < totalPages - 3 && <span>...</span>}
      <button onClick={() => gotoPage(totalPages)}>{totalPages}</button>
    </>
  )}

  <button disabled={page >= totalPages} onClick={() => gotoPage(page + 1)}>Next</button>
</div>

      </section>
      <section>
  <label htmlFor="method-select"><strong>Show:</strong> </label>
  <select
    id="method-select"
    value={methods}
    onChange={(e) => setmethods(Number(e.target.value))}
  >
    <option value={0}>Pending Withdrawals</option>
    <option value={1}>Deposits</option>
  </select>
</section>
    {methods===0 &&(  <section>
        <h2>Pending Withdrawals</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>withdrwal id</th>
              <th>Phone Number</th>
              <th>Method</th>
              <th>via</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentWithdrawals.length ? currentWithdrawals.map((withdrawal)  => (
              <tr key={withdrawal._id}>
               <td>{withdrawal.withdrawalId}</td>
                <td>{withdrawal.phoneNumber}</td>
                <td>{withdrawal.method}</td>
                <td>{withdrawal.type}</td>
                <td>{withdrawal.amount}</td>
                <td>{new Date(withdrawal.createdAt).toLocaleString()}</td>
                <td>
                  <button 
                    className="confirm-btn" 
                    onClick={() => updateWithdrawalStatus(withdrawal.withdrawalId)}
                  >
                    Confirm
                  </button>
                  
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" style={{ textAlign: "center" }}>No pending withdrawals</td></tr>
            )}
          </tbody>
        </table>
           <div className="pagination">
      <button 
        disabled={withdrawalPage <= 1} 
        onClick={() => setWithdrawalPage(withdrawalPage - 1)}
      >
        Prev
      </button>
      <span>Page {withdrawalPage} / {withdrawalTotalPages || 1}</span>
      <button 
        disabled={withdrawalPage >= withdrawalTotalPages} 
        onClick={() => setWithdrawalPage(withdrawalPage + 1)}
      >
        Next
      </button>
    </div>
      </section>)}
      {methods === 1 &&(<section>
        <h2>deposit list</h2>
        <table className="users-table">
          <thead>
            <tr>
              <th>deposit id</th>
              <th>Phone Number</th>
              <th>Method</th>
              <th>via</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentDeposits.length ? currentDeposits.map((deposit) => (
              <tr key={deposit._id}>
               <td>{deposit.depositId}</td>
                <td>{deposit.phoneNumber}</td>
                <td>{deposit.method}</td>
                <td>{deposit.type}</td>
                <td>{deposit.amount}</td>
                <td>{new Date(deposit.createdAt).toLocaleString()}</td>
                <td>
                  <button 
                    className="confirm-btn" 
                    onClick={() => updatedepoStatus(deposit.depositId)}
                  >
                    Confirm
                  </button>
                  
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" style={{ textAlign: "center" }}>No pending withdrawals</td></tr>
            )}
          </tbody>
        </table>
         <div className="pagination">
      <button 
        disabled={depositPage <= 1} 
        onClick={() => setDepositPage(depositPage - 1)}
      >
        Prev
      </button>
      <span>Page {depositPage} / {depositTotalPages || 1}</span>
      <button 
        disabled={depositPage >= depositTotalPages} 
        onClick={() => setDepositPage(depositPage + 1)}
      >
        Next
      </button>
    </div>
      </section>)}
      {/* Registration */}
      
      <section>
  <h2>Recent Transactions</h2>
  <table className="users-table">
    <thead>
      <tr>
        <th>Transaction #</th>
        <th>Type</th>
        <th>Amount</th>
        <th>Message</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      {transactionlist.length ? transactionlist.map((t) => (
        <tr key={t._id}>
          <td>{t.transactionNumber}</td>
          <td>{t.type}</td>
          <td>{t.amount}</td>
          <td>{t.rawMessage}</td>
          <td>{new Date(t.createdAt).toLocaleString()}</td>
        </tr>
      )) : (
        <tr><td colSpan="5" style={{ textAlign: "center" }}>No transactions yet</td></tr>
      )}
    </tbody>
  </table>
</section>
    </div>
  );
}
