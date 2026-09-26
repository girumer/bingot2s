import React from "react";
import { Navigate, Outlet } from "react-router-dom";

function ProtectedAdminRoute() {
  const adminToken = localStorage.getItem("admintoken"); // check admin token
  return adminToken ? <Outlet /> : <Navigate to="/" />; // redirect to admin login if not logged in
}

export default ProtectedAdminRoute;
