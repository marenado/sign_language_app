import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import { Box, Button, Typography, TextField, Select, MenuItem } from "@mui/material";

const ModuleManagement = () => {
  const [modules, setModules] = useState([]);
  const [moduleData, setModuleData] = useState({
    title: "",
    description: "",
    version: 1,
    prerequisite_mod: null,
  });

  // Fetch all modules
  const fetchModules = async () => {
    try {
      const res = await axios.get("/admin/modules", {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setModules(res.data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  // Handle module creation
  const createModule = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/admin/modules", moduleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      fetchModules(); // Refresh modules after creation
      setModuleData({ title: "", description: "", version: 1, prerequisite_mod: null }); // Reset form
    } catch (error) {
      console.error("Error creating module:", error);
    }
  };

  // Handle module deletion
  const deleteModule = async (moduleId) => {
    try {
      await axios.delete(`/admin/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      fetchModules(); // Refresh modules after deletion
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto", // Enable scrolling for the main content
          padding: "20px",
          backgroundColor: "#f5f5f5",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: "20px" }}>
          Module Management
        </Typography>

        {/* Module Creation Form */}
        <Box
          component="form"
          onSubmit={createModule}
          sx={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            marginBottom: "20px",
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: "20px" }}>
            Create a New Module
          </Typography>
          <TextField
            fullWidth
            label="Title"
            value={moduleData.title}
            onChange={(e) => setModuleData({ ...moduleData, title: e.target.value })}
            required
            sx={{ marginBottom: "20px" }}
          />
          <TextField
            fullWidth
            label="Description"
            value={moduleData.description}
            onChange={(e) => setModuleData({ ...moduleData, description: e.target.value })}
            required
            multiline
            rows={4}
            sx={{ marginBottom: "20px" }}
          />
          <TextField
            fullWidth
            label="Version"
            type="number"
            value={moduleData.version}
            onChange={(e) => setModuleData({ ...moduleData, version: Number(e.target.value) })}
            required
            sx={{ marginBottom: "20px" }}
          />
          <Select
            fullWidth
            value={moduleData.prerequisite_mod || ""}
            onChange={(e) =>
              setModuleData({ ...moduleData, prerequisite_mod: e.target.value || null })
            }
            displayEmpty
            sx={{ marginBottom: "20px" }}
          >
            <MenuItem value="">
              <em>No Prerequisite</em>
            </MenuItem>
            {modules.map((module) => (
              <MenuItem key={module.module_id} value={module.module_id}>
                {module.title}
              </MenuItem>
            ))}
          </Select>
          <Button variant="contained" color="primary" type="submit">
            Create Module
          </Button>
        </Box>

        {/* Module List */}
        <Box>
          <Typography variant="h6" sx={{ marginBottom: "20px" }}>
            Existing Modules
          </Typography>
          {modules.map((module) => (
            <Box
              key={module.module_id}
              sx={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                marginBottom: "20px",
              }}
            >
              <Typography variant="h6">{module.title}</Typography>
              <Typography>{module.description}</Typography>
              <Typography>Version: {module.version}</Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => deleteModule(module.module_id)}
                sx={{ marginTop: "10px" }}
              >
                Delete
              </Button>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ModuleManagement;
