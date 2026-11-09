import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

// Admin dashboard: overview, users, payments (withdrawals / deposits),
// pending deposit messages, and quick links. Uses the same admin API as before.

const USERS_PER_PAGE = 10;
const ROWS_PER_PAGE = 8;

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "payments", label: "Payments", icon: "💳" },
  { id: "transactions", label: "Pending deposits", icon: "🧾" },
];

const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const when = (d) =>
  d ? new Date(d).toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium", timeStyle: "short" }) : "—";

function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) nums.push(p);
  return (
    <div className="ad-pager">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
      {nums[0] > 1 && <><button onClick={() => onPage(1)}>1</button>{nums[0] > 2 && <span>…</span>}</>}
      {nums.map((p) => (
        <button key={p} className={p === page ? "active" : ""} onClick={() => onPage(p)}>{p}</button>
      ))}
      {nums[nums.length - 1] < pages && (
        <>{nums[nums.length - 1] < pages - 1 && <span>…</span>}<button onClick={() => onPage(pages)}>{pages}</button></>
      )}
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
    </div>
  );
}

export default function AdminDashboard() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  const navigate = useNavigate();
  const token = localStorage.getItem("admintoken");
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [section, setSection] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { type, text }
  const [confirm, setConfirm] = useState(null); // { title, body, action, danger }

  const [summary, setSummary] = useState({ totalDeposit: 0, totalWithdraw: 0 });
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userFilter, setUserFilter] = useState("");

  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [payTab, setPayTab] = useState("withdrawals");
  const [payPage, setPayPage] = useState(1);
  const [txFilter, setTxFilter] = useState("");
  const [txPage, setTxPage] = useState(1);

  const [form, setForm] = useState({ username: "", phoneNumber: "", role: "client", password: "" });
  const [formBusy, setFormBusy] = useState(false);

  const say = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  // Expired or missing admin login → back to the admin login page.
  const handleAuthError = useCallback(
    (err) => {
      const s = err?.response?.status;
      if (s === 401 || s === 403) {
        localStorage.removeItem("admintoken");
        navigate("/admines");
        return true;
      }
      return false;
    },
    [navigate]
  );

  const get = useCallback(
    async (path) => {
      const { data } = await axios.get(`${BACKEND_URL}${path}`, { headers: authHeader });
      return data;
    },
    [BACKEND_URL, authHeader]
  );

  // ---------- loaders ----------
  const loadSummary = useCallback(async () => {
    const data = await get("/admin/transactions");
    setSummary({ totalDeposit: data?.totalDeposit ?? 0, totalWithdraw: data?.totalWithdraw ?? 0 });
  }, [get]);

  const loadUsers = useCallback(
    async (p = 1) => {
      const data = await get(`/admin/users?page=${p}&limit=${USERS_PER_PAGE}`);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotalUsers(data.totalUsers ?? 0);
      setUserPages(data.totalPages ?? 1);
      setUserPage(data.currentPage ?? p);
    },
    [get]
  );

  const loadPayments = useCallback(async () => {
    const [w, d, pend] = await Promise.all([
      get("/admin/pending-withdrawals"),
      get("/admin/deposit"),
      get("/admin/transactions-list"),
    ]);
    setWithdrawals(Array.isArray(w) ? w : []);
    setDeposits(Array.isArray(d) ? d : []);
    setPendingDeposits(Array.isArray(pend) ? pend : pend?.transactions || []);
  }, [get]);

  const loadAll = useCallback(
    async (p = userPage) => {
      try {
        await Promise.all([loadSummary(), loadUsers(p), loadPayments()]);
      } catch (err) {
        if (!handleAuthError(err)) say("error", "Could not load some data. Check the server and try again.");
      }
    },
    [loadSummary, loadUsers, loadPayments, handleAuthError, userPage]
  );

  useEffect(() => {
    if (!token) {
      navigate("/admines");
      return;
    }
    (async () => {
      await loadAll(1);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // ---------- actions ----------
  const confirmWithdrawal = (w) =>
    setConfirm({
      title: "Confirm withdrawal?",
      body: `Mark withdrawal #${w.withdrawalId} of ${fmt(w.amount)} ETB to ${w.phoneNumber} (${w.type}) as paid. Only do this after you have sent the money.`,
      action: async () => {
        try {
          await axios.post(`${BACKEND_URL}/admin/confirm-withdrawal`, { withdrawalId: w.withdrawalId }, { headers: authHeader });
          say("ok", `Withdrawal #${w.withdrawalId} confirmed.`);
          await Promise.all([loadPayments(), loadSummary()]);
        } catch (err) {
          if (!handleAuthError(err)) say("error", err?.response?.data?.message || err?.response?.data?.error || "Could not confirm the withdrawal.");
        }
      },
    });

  const confirmDeposit = (d) =>
    setConfirm({
      title: "Confirm deposit?",
      body: `Mark deposit #${d.depositId ?? "—"} of ${fmt(d.amount)} ETB from ${d.phoneNumber} as handled.`,
      action: async () => {
        try {
          await axios.post(`${BACKEND_URL}/admin/confirm-depo`, { depositId: d.depositId }, { headers: authHeader });
          say("ok", "Deposit confirmed.");
          await Promise.all([loadPayments(), loadSummary()]);
        } catch (err) {
          if (!handleAuthError(err)) say("error", err?.response?.data?.message || "Could not confirm the deposit.");
        }
      },
    });

  const deleteUser = (u) =>
    setConfirm({
      title: `Delete ${u.username}?`,
      body: `This permanently deletes the account ${u.username} (${u.phoneNumber}) including its wallet of ${fmt(u.Wallet)} ETB and game history. This cannot be undone.`,
      danger: true,
      action: async () => {
        try {
          await axios.delete(`${BACKEND_URL}/admin/delete-user/${u._id}`, { headers: authHeader });
          say("ok", `${u.username} deleted.`);
          await Promise.all([loadUsers(userPage), loadSummary()]);
        } catch (err) {
          if (!handleAuthError(err)) say("error", err?.response?.data?.message || "Delete failed.");
        }
      },
    });

  const broadcast = () =>
    setConfirm({
      title: "Send broadcast to all users?",
      body: `This sends the broadcast message from the bot to every registered user (${fmt(totalUsers)} accounts). It can take a long time and cannot be stopped once started.`,
      danger: true,
      action: async () => {
        say("ok", "Broadcast started. You can keep using the dashboard.");
        try {
          const { data } = await axios.post(`${BACKEND_URL}/admin/brodcast`, {}, { headers: authHeader, timeout: 0 });
          say("ok", data?.message || "Broadcast finished.");
        } catch (err) {
          if (!handleAuthError(err)) say("error", "Broadcast request ended early — check the server log for how many were sent.");
        }
      },
    });

  const register = async (e) => {
    e.preventDefault();
    setFormBusy(true);
    try {
      // The server requires a password for every account (clients sign in with Telegram;
      // their password is only used if they ever use the web login).
      const { data } = await axios.post(`${BACKEND_URL}/admin/register-user`, form, { headers: authHeader });
      say("ok", data?.message || "User registered.");
      setForm({ username: "", phoneNumber: "", role: "client", password: "" });
      await Promise.all([loadUsers(userPage), loadSummary()]);
    } catch (err) {
      if (!handleAuthError(err)) say("error", err?.response?.data?.message || "Registration failed.");
    } finally {
      setFormBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("admintoken");
    navigate("/admines");
  };

  const go = (id) => {
    setSection(id);
    setMenuOpen(false);
    window.scrollTo?.(0, 0);
  };

  // ---------- derived ----------
  const pendingWithdrawals = withdrawals.filter((w) => !w.status || w.status === "pending");
  const pendingWithdrawTotal = pendingWithdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);
  const net = Number(summary.totalDeposit) - Number(summary.totalWithdraw);

  const shownUsers = userFilter
    ? users.filter((u) => `${u.username} ${u.phoneNumber}`.toLowerCase().includes(userFilter.toLowerCase()))
    : users;

  const payRows = payTab === "withdrawals" ? withdrawals : deposits;
  const payPages = Math.max(1, Math.ceil(payRows.length / ROWS_PER_PAGE));
  const payShown = payRows.slice((payPage - 1) * ROWS_PER_PAGE, payPage * ROWS_PER_PAGE);

  const txRows = txFilter
    ? pendingDeposits.filter((t) =>
        `${t.transactionNumber} ${t.phoneNumber} ${t.rawMessage}`.toLowerCase().includes(txFilter.toLowerCase())
      )
    : pendingDeposits;
  const txPages = Math.max(1, Math.ceil(txRows.length / ROWS_PER_PAGE));
  const txShown = txRows.slice((txPage - 1) * ROWS_PER_PAGE, txPage * ROWS_PER_PAGE);

  if (loading) {
    return (
      <div className="ad">
        <div className="ad-loading"><span className="ad-spinner" /> Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="ad">
      {/* ---------- sidebar ---------- */}
      <aside className={`ad-side ${menuOpen ? "open" : ""}`}>
        <div className="ad-brand">
          <span className="ad-brand-mark">A</span>
          <div>
            <div className="ad-brand-name">Adey Admin</div>
            <div className="ad-brand-sub">Bingo · Keno</div>
          </div>
        </div>
        <div className="ad-nav" role="navigation">
          {SECTIONS.map((s) => (
            <button key={s.id} className={section === s.id ? "active" : ""} onClick={() => go(s.id)}>
              <span className="ad-nav-icon">{s.icon}</span>
              {s.label}
              {s.id === "payments" && pendingWithdrawals.length > 0 && <span className="ad-count">{pendingWithdrawals.length}</span>}
              {s.id === "transactions" && pendingDeposits.length > 0 && <span className="ad-count">{pendingDeposits.length}</span>}
            </button>
          ))}
          <button onClick={() => navigate("/KenoAdmin")}>
            <span className="ad-nav-icon">🎱</span>Keno report<span className="ad-ext">↗</span>
          </button>
        </div>
        <div className="ad-side-foot">
          <button className="ad-btn ghost full" onClick={broadcast}>📣 Broadcast</button>
          <button className="ad-btn ghost full" onClick={logout}>⎋ Log out</button>
        </div>
      </aside>
      {menuOpen && <div className="ad-scrim" onClick={() => setMenuOpen(false)} />}

      {/* ---------- main ---------- */}
      <main className="ad-main">
        <div className="ad-top">
          <button className="ad-burger" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>☰</button>
          <div>
            <h1>{SECTIONS.find((s) => s.id === section)?.label}</h1>
            <p className="ad-muted">Adey Bingo administration</p>
          </div>
          <button className="ad-btn" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "↻ Refresh"}</button>
        </div>

        {/* ===== OVERVIEW ===== */}
        {section === "overview" && (
          <>
            <section className="ad-kpis">
              <div className="ad-kpi"><span>Total deposits</span><strong>{fmt(summary.totalDeposit)}<em>ETB</em></strong></div>
              <div className="ad-kpi"><span>Total withdrawals</span><strong>{fmt(summary.totalWithdraw)}<em>ETB</em></strong></div>
              <div className={`ad-kpi ${net >= 0 ? "pos" : "neg"}`}><span>Deposits − withdrawals</span><strong>{fmt(net)}<em>ETB</em></strong></div>
              <div className="ad-kpi"><span>Registered users</span><strong>{fmt(totalUsers)}</strong></div>
              <button className="ad-kpi link warn" onClick={() => go("payments")}>
                <span>Withdrawals waiting</span><strong>{pendingWithdrawals.length}</strong><small>{fmt(pendingWithdrawTotal)} ETB to pay</small>
              </button>
              <button className="ad-kpi link" onClick={() => go("transactions")}>
                <span>Deposit messages waiting</span><strong>{pendingDeposits.length}</strong><small>not yet claimed by players</small>
              </button>
            </section>

            <div className="ad-grid2">
              <section className="ad-card">
                <div className="ad-card-head">
                  <h2>Latest withdrawals</h2>
                  <button className="ad-link" onClick={() => go("payments")}>View all →</button>
                </div>
                <table className="ad-table compact">
                  <tbody>
                    {withdrawals.slice(0, 5).map((w) => (
                      <tr key={w._id}>
                        <td><div className="ad-strong">{w.phoneNumber}</div><div className="ad-muted">{when(w.createdAt)}</div></td>
                        <td><span className={`ad-chip ${w.type}`}>{w.type}</span></td>
                        <td className="ad-num">{fmt(w.amount)}</td>
                      </tr>
                    ))}
                    {!withdrawals.length && <tr><td className="ad-empty">No withdrawals.</td></tr>}
                  </tbody>
                </table>
              </section>

              <section className="ad-card">
                <div className="ad-card-head"><h2>Register user</h2></div>
                <form className="ad-form" onSubmit={register}>
                  <label>Username<input name="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
                  <label>Phone number<input name="phoneNumber" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="2519…" required /></label>
                  <label>Role
                    <select name="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label>Password<input name="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></label>
                  <button className="ad-btn primary" disabled={formBusy}>{formBusy ? "Saving…" : "Register user"}</button>
                </form>
              </section>
            </div>
          </>
        )}

        {/* ===== USERS ===== */}
        {section === "users" && (
          <section className="ad-card">
            <div className="ad-card-head">
              <h2>Users <span className="ad-muted">({fmt(totalUsers)})</span></h2>
              <input className="ad-search" placeholder="Filter this page by name or phone…" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
            </div>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Username</th><th>Phone</th><th>Role</th><th className="ad-num">Wallet (ETB)</th><th className="ad-num">Coins</th><th /></tr></thead>
                <tbody>
                  {shownUsers.map((u) => (
                    <tr key={u._id}>
                      <td className="ad-strong">{u.username}</td>
                      <td>{u.phoneNumber}</td>
                      <td><span className={`ad-chip ${u.role}`}>{u.role}</span></td>
                      <td className="ad-num">{fmt(u.Wallet)}</td>
                      <td className="ad-num">{fmt(u.coins)}</td>
                      <td className="ad-actions"><button className="ad-btn danger sm" onClick={() => deleteUser(u)}>Delete</button></td>
                    </tr>
                  ))}
                  {!shownUsers.length && <tr><td colSpan={6} className="ad-empty">No users found.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={userPage} pages={userPages} onPage={(p) => loadUsers(p).catch(handleAuthError)} />
          </section>
        )}

        {/* ===== PAYMENTS ===== */}
        {section === "payments" && (
          <section className="ad-card">
            <div className="ad-card-head">
              <div className="ad-tabs">
                <button className={payTab === "withdrawals" ? "active" : ""} onClick={() => { setPayTab("withdrawals"); setPayPage(1); }}>
                  Withdrawals <b>{withdrawals.length}</b>
                </button>
                <button className={payTab === "deposits" ? "active" : ""} onClick={() => { setPayTab("deposits"); setPayPage(1); }}>
                  Deposits <b>{deposits.length}</b>
                </button>
              </div>
            </div>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>{payTab === "withdrawals" ? "Withdrawal #" : "Deposit #"}</th>
                    <th>Phone</th><th>Via</th><th className="ad-num">Amount (ETB)</th><th>Status</th><th>Date</th><th />
                  </tr>
                </thead>
                <tbody>
                  {payShown.map((r) => (
                    <tr key={r._id}>
                      <td className="ad-strong">{payTab === "withdrawals" ? r.withdrawalId : r.depositId ?? r.transactionNumber}</td>
                      <td>{r.phoneNumber}</td>
                      <td><span className={`ad-chip ${r.type}`}>{r.type}</span></td>
                      <td className="ad-num">{fmt(r.amount)}</td>
                      <td><span className={`ad-chip st-${r.status || "pending"}`}>{r.status || "pending"}</span></td>
                      <td className="ad-muted">{when(r.createdAt)}</td>
                      <td className="ad-actions">
                        <button className="ad-btn primary sm" onClick={() => (payTab === "withdrawals" ? confirmWithdrawal(r) : confirmDeposit(r))}>Confirm</button>
                      </td>
                    </tr>
                  ))}
                  {!payShown.length && <tr><td colSpan={7} className="ad-empty">Nothing here.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={payPage} pages={payPages} onPage={setPayPage} />
          </section>
        )}

        {/* ===== PENDING DEPOSIT MESSAGES ===== */}
        {section === "transactions" && (
          <section className="ad-card">
            <div className="ad-card-head">
              <h2>Deposit messages waiting <span className="ad-muted">({pendingDeposits.length})</span></h2>
              <input className="ad-search" placeholder="Search transaction #, phone or text…" value={txFilter} onChange={(e) => { setTxFilter(e.target.value); setTxPage(1); }} />
            </div>
            <p className="ad-muted ad-pad">Payment SMS messages received by the system that no player has claimed yet.</p>
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Transaction #</th><th>Via</th><th className="ad-num">Amount (ETB)</th><th>Message</th><th>Received</th></tr></thead>
                <tbody>
                  {txShown.map((t) => (
                    <tr key={t._id}>
                      <td className="ad-strong ad-mono">{t.transactionNumber}</td>
                      <td><span className={`ad-chip ${t.type}`}>{t.type}</span></td>
                      <td className="ad-num">{fmt(t.amount)}</td>
                      <td className="ad-msg" title={t.rawMessage}>{t.rawMessage}</td>
                      <td className="ad-muted">{when(t.createdAt)}</td>
                    </tr>
                  ))}
                  {!txShown.length && <tr><td colSpan={5} className="ad-empty">No waiting deposit messages.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={txPage} pages={txPages} onPage={setTxPage} />
          </section>
        )}
      </main>

      {/* ---------- confirm dialog ---------- */}
      {confirm && (
        <div className="ad-modal" role="dialog" aria-modal="true">
          <div className="ad-modal-box">
            <h3>{confirm.title}</h3>
            <p>{confirm.body}</p>
            <div className="ad-modal-actions">
              <button className="ad-btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className={`ad-btn ${confirm.danger ? "danger" : "primary"}`}
                onClick={async () => {
                  const action = confirm.action;
                  setConfirm(null);
                  await action();
                }}
              >
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`ad-toast ${toast.type}`}>{toast.text}</div>}
    </div>
  );
}
