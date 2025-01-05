import React, { useEffect, useState } from "react";
import { Avatar, Box, Button, TextField, Typography } from "@mui/material";
import axios from "axios";
import Sidebar from "./Sidebar"; // Import reusable Sidebar component

const Settings = () => {
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No authentication token found.");

        const response = await axios.get("http://127.0.0.1:8000/users/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUserData({
          firstName: response.data.firstName || "",
          lastName: response.data.lastName || "",
          email: response.data.email || "",
          password: "",
        });
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found.");

      await axios.put(
        "http://127.0.0.1:8000/users/update-profile",
        {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Profile updated successfully.");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update profile.");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#f7f7f7",
        overflow: "hidden",
      }}
    >
      {/* Reusable Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflowY: "auto",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: "20px" }}>
          Profile
        </Typography>
        <Avatar
          sx={{
            width: "120px",
            height: "120px",
            marginBottom: "20px",
          }}
          src="https://via.placeholder.com/120"
          alt="User Avatar"
        />
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          {userData.firstName} {userData.lastName}
        </Typography>
        <Typography variant="body2" sx={{ color: "#666", marginBottom: "40px" }}>
          {userData.email}
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: "100%",
            maxWidth: "600px",
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "20px 30px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: "20px", fontWeight: "bold" }}>
            Basic Info
          </Typography>
          <Box sx={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <TextField
              fullWidth
              label="First Name"
              variant="outlined"
              value={userData.firstName}
              onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
            />
            <TextField
              fullWidth
              label="Last Name"
              variant="outlined"
              value={userData.lastName}
              onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
            />
          </Box>
          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            sx={{ marginBottom: "20px" }}
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            variant="outlined"
            value={userData.password}
            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
            sx={{ marginBottom: "20px" }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" sx={{ backgroundColor: "#5b21b6", color: "#fff" }}>
              Save
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;
