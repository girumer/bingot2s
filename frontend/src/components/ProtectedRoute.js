// ProtectedRoute.js

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    
    // Get all parameters from the URL
    const usernameFromUrl = searchParams.get("username");
    const telegramIdFromUrl = searchParams.get("telegramId");
    const roomIdFromUrl = searchParams.get("roomId");
    const stakeFromUrl = searchParams.get("stake");

    // Get stored credentials
    const storedUsername = localStorage.getItem("username");
    const storedTelegramId = localStorage.getItem("telegramId");

    // Prioritize URL data, then fall back to localStorage
    const username = usernameFromUrl || storedUsername;
    const telegramId = telegramIdFromUrl || storedTelegramId;

    // Check for authentication
    const isAuthenticated = username && telegramId;

    // Save the most current data to localStorage for persistence
    if (usernameFromUrl) {
        localStorage.setItem("username", usernameFromUrl);
    }
    if (telegramIdFromUrl) {
        localStorage.setItem("telegramId", telegramIdFromUrl);
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Pass all valid parameters to children via context
    return (
        <Outlet 
            context={{ 
                usernameFromUrl: username, 
                telegramIdFromUrl: telegramId,
                roomIdFromUrl: roomIdFromUrl,
                stakeFromUrl: stakeFromUrl,
            }} 
        />
    );
}

export default ProtectedRoute;