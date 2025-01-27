import React from "react"; 
import { Box, Typography, Divider } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const sidebarItems = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Dictionary", path: "/dictionary" },
    { name: "Modules", path: isAdmin ? "/admin/modules" : "/modules" },
  ].filter((item) => !(isAdmin && item.name === "Dashboard"));

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "250px",
        backgroundColor: "#5b21b6",
        color: "#fff",
        padding: "20px",
        borderRadius: "0 20px 20px 0",
        justifyContent: "space-between",
      }}
    >
      {/* Navigation Section */}
      <Box>
        {/* "SignLearn" Text */}
        <Typography
          variant="h5"
          sx={{
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          SignLearn
        </Typography>

        {/* Horizontal Line below "SignLearn" */}
        <Divider
          sx={{
            backgroundColor: "#fff", // Line color
            marginBottom: "20px",
          }}
        />

        {/* Sidebar Navigation */}
        <nav>
          {sidebarItems.map((item, index) => (
            <Box
              key={index}
              onClick={() => navigate(item.path)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "10px",
                textAlign: "center",
                backgroundColor:
                  location.pathname === item.path ? "#E6DFFF" : "transparent",
                color: location.pathname === item.path ? "#4a148c" : "#fff",
                fontWeight: location.pathname === item.path ? "bold" : "normal",
                transition: "background-color 0.3s ease",
                "&:hover": {
                  backgroundColor: "#E6DFFF",
                  color: "#4a148c",
                },
              }}
            >
              {item.name}
            </Box>
          ))}
        </nav>
      </Box>

      {/* Settings and Log Out Section */}
      <Box>
        {/* Horizontal Line above "Settings" */}
        <Divider
          sx={{
            backgroundColor: "#fff", // Line color
            marginBottom: "10px",
          }}
        />

        {/* Settings Option */}
        <Box
          onClick={() =>
            navigate(isAdmin ? "/admin/settings" : "/users/profile")
          }
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: "15px",
            borderRadius: "10px",
            textAlign: "center",
            backgroundColor:
              location.pathname ===
              (isAdmin ? "/admin/settings" : "/users/profile")
                ? "#E6DFFF"
                : "transparent",
            color:
              location.pathname ===
              (isAdmin ? "/admin/settings" : "/users/profile")
                ? "#4a148c"
                : "#fff",
            fontWeight:
              location.pathname ===
              (isAdmin ? "/admin/settings" : "/users/profile")
                ? "bold"
                : "normal",
            transition: "background-color 0.3s ease",
            "&:hover": {
              backgroundColor: "#E6DFFF",
              color: "#4a148c",
            },
          }}
        >
          Settings
        </Box>

        {/* Log Out Option */}
        <Box
          onClick={handleLogout}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: "15px",
            borderRadius: "10px",
            textAlign: "center",
            color: "#F87171",
            "&:hover": {
              backgroundColor: "#E6DFFF",
              color: "#4a148c",
            },
          }}
        >
          Log Out
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
