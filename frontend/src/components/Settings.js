import React, { useEffect, useState } from "react";
import { Avatar, Box, Button, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

const Settings = () => {
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "",
    avatar: "",
    role: "", // "admin" | "user"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const resolveRole = (me) =>
    me?.role === "admin" || me?.is_admin ? "admin" : "user";

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Who am I?
      const { data: me } = await api.get("/auth/me");
      const role = resolveRole(me);

      // 2) Load profile data (fallback to /auth/me if the specific endpoint isn’t needed)
      let profile = me;
      try {
        const endpoint = role === "admin" ? "/admin/settings" : "/users/profile";
        const { data } = await api.get(endpoint);
        profile = data || me;
      } catch {
        // If that endpoint isn’t available, we’ll just use /auth/me data.
      }

      setUserData({
        username: profile.username || "",
        email: profile.email || "",
        avatar: profile.avatar || "",
        password: "",
        role,
      });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to fetch user data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        username: userData.username,
        email: userData.email,
        // send password only if user typed one
        ...(userData.password ? { password: userData.password } : {}),
      };

      const endpoint =
        userData.role === "admin" ? "/admin/settings" : "/users/settings";

      await api.put(endpoint, payload);
      navigate("/dashboard"); // or show a success toast/snackbar
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const endpoint =
        userData.role === "admin"
          ? "/admin/update-avatar"
          : "/users/update-avatar";
      const { data } = await api.put(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUserData((prev) => ({ ...prev, avatar: data?.avatar || prev.avatar }));
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to update avatar."
      );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", height: "100vh" }}>
        <Sidebar />
        <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Typography>Loading…</Typography>
        </Box>
      </Box>
    );
  }

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
