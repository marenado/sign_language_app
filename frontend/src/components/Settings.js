import React, { useEffect, useState } from "react";
import { Avatar, Box, Button, TextField, Typography } from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Settings = () => {
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "",
    avatar: "",
    role: "", // Add role property to differentiate between admin and regular users
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Fetch user data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const isAdmin = localStorage.getItem("isAdmin") === "true"; // Check if the user is an admin
        if (!token) throw new Error("No authentication token found.");
  
        const apiEndpoint = isAdmin
          ? "https://signlearn.onrender.com/admin/settings" // Admin-specific settings
          : "https://signlearn.onrender.com/users/profile"; // Regular user settings
  
        const response = await axios.get(apiEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        setUserData({
          username: response.data.username || "",
          email: response.data.email || "",
          avatar: response.data.avatar || "",
          password: "",
          role: isAdmin ? "admin" : "user", // Set role dynamically
        });
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);
  

  // Handle form submission for updating profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found.");
  
      const payload = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
      };
  
      const apiEndpoint =
        userData.role === "admin"
          ? "https://signlearn.onrender.com/admin/settings"
          : "https://signlearn.onrender.com/users/settings";
  
      await axios.put(apiEndpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      alert("Profile updated successfully!");
      navigate("/dashboard");
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Failed to update profile.";
      alert(errorMessage);
    }
  };
  

  // Handle avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found.");

      const response = await axios.put(
        "https://signlearn.onrender.com/users/update-avatar",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUserData((prevData) => ({
        ...prevData,
        avatar: response.data.avatar,
      }));
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Failed to update avatar.";
      alert(errorMessage);
    }
  };

  // if (loading) return <p>Loading...</p>;
  // if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        background: "linear-gradient(to bottom, white, #E6DFFF)",
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

        {/* Conditionally Render Avatar for Non-Admin Users */}
        {userData.role !== "admin" && (
          <>
            <Avatar
              sx={{
                width: "120px",
                height: "120px",
                marginBottom: "20px",
              }}
              src={userData.avatar || "https://via.placeholder.com/120"}
              alt="User Avatar"
            />
            <Button
              variant="outlined"
              component="label"
              sx={{
                marginBottom: "20px",
                textTransform: "none",
              }}
            >
              Change Avatar
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
            </Button>
          </>
        )}

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
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={userData.username}
            onChange={(e) => setUserData({ ...userData, username: e.target.value })}
            sx={{ marginBottom: "20px" }}
          />
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
            <Button
              type="submit"
              variant="contained"
              sx={{ backgroundColor: "#5b21b6", color: "#fff" }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;
