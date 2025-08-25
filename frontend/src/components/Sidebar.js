// Sidebar.jsx
import React, { useContext, useCallback } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";                  // axios with { withCredentials: true }
import { AuthContext } from "../App";               // <-- from the App.js I gave you

const Sidebar = ({ isAdmin: isAdminProp }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Prefer context (authoritative); allow prop as fallback if you render Sidebar outside provider
  const { auth, logout } = useContext(AuthContext);
  const isAdmin = typeof isAdminProp === "boolean" ? isAdminProp : !!auth?.isAdmin;

  const sidebarItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Dictionary", path: "/dictionary" },
    { name: "Modules", path: isAdmin ? "/admin/modules" : "/modules" },
  ].filter((item) => !(isAdmin && item.name === "Dashboard"));

  const handleLogout = useCallback(async () => {
    try {
      await api.post("/auth/logout");              // clears sl_access + sl_refresh on server
    } catch {
      // ignore; we'll still nuke client auth state
    }
    logout();                                      // <-- flips {authenticated:false, isAdmin:false}
    navigate("/", { replace: true });         // go straight to login
    // Optional belt & suspenders if you ever see state glitches:
    // window.location.assign("/login");
  }, [logout, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "250px",
        backgroundColor: "#5b21b6",
        color: "#fff",
        p: "20px",
        borderRadius: "0 20px 20px 0",
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>
          SignLearn
        </Typography>
        <Divider sx={{ backgroundColor: "#fff", mb: 2 }} />

        <nav>
          {sidebarItems.map((item) => (
            <Box
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                p: "15px",
                borderRadius: "10px",
                mb: "10px",
                textAlign: "center",
                backgroundColor:
                  location.pathname === item.path ? "#E6DFFF" : "transparent",
                color:
                  location.pathname === item.path ? "#4a148c" : "#fff",
                fontWeight:
                  location.pathname === item.path ? "bold" : "normal",
                transition: "background-color .3s ease",
                "&:hover": { backgroundColor: "#E6DFFF", color: "#4a148c" },
              }}
            >
              {item.name}
            </Box>
          ))}
        </nav>
      </Box>

      <Box>
        <Divider sx={{ backgroundColor: "#fff", mb: 1 }} />
        <Box
          onClick={() => navigate(isAdmin ? "/admin/settings" : "/users/profile")}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            p: "15px",
            borderRadius: "10px",
            textAlign: "center",
            backgroundColor:
              location.pathname === (isAdmin ? "/admin/settings" : "/users/profile")
                ? "#E6DFFF"
                : "transparent",
            color:
              location.pathname === (isAdmin ? "/admin/settings" : "/users/profile")
                ? "#4a148c"
                : "#fff",
            fontWeight:
              location.pathname === (isAdmin ? "/admin/settings" : "/users/profile")
                ? "bold"
                : "normal",
            transition: "background-color .3s ease",
            "&:hover": { backgroundColor: "#E6DFFF", color: "#4a148c" },
          }}
        >
          Settings
        </Box>

        <Box
          onClick={handleLogout}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            p: "15px",
            borderRadius: "10px",
            textAlign: "center",
            color: "#F87171",
            "&:hover": { backgroundColor: "#E6DFFF", color: "#4a148c" },
          }}
        >
          Log Out
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
