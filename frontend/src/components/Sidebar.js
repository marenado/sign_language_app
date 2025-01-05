import React from "react";
import { Box, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarItems = [
    { name: "Dashboard", path: "/dashboard" }, // Updated to match routing
    { name: "Dictionary", path: "/dictionary" },
    { name: "Modules", path: "/modules" },
  ];

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
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            marginBottom: "40px",
            textAlign: "center",
          }}
        >
        </Typography>
        <nav>
          {sidebarItems.map((item, index) => (
            <Box
              key={index}
              onClick={() => navigate(item.path)} // Navigate to the correct page
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "10px",
                textAlign: "center",
                backgroundColor: location.pathname === item.path ? "#E6DFFF" : "transparent",
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
        <Box
          sx={{
            width: "100%",
            height: "1px",
            backgroundColor: "#e0e0e0",
            margin: "20px 0",
          }}
        ></Box>

        <Box
          onClick={() => navigate("/settings")} // Navigate to Settings
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: "15px",
            borderRadius: "10px",
            textAlign: "center",
            backgroundColor: location.pathname === "/settings" ? "#E6DFFF" : "transparent",
            color: location.pathname === "/settings" ? "#4a148c" : "#fff",
            fontWeight: location.pathname === "/settings" ? "bold" : "normal",
            transition: "background-color 0.3s ease",
            "&:hover": {
              backgroundColor: "#E6DFFF",
              color: "#4a148c",
            },
          }}
        >
          Settings
        </Box>

        <Box
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
          onClick={() => {
            // Add your logout logic here
            console.log("Log Out Clicked");
          }}
        >
          Log Out
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
