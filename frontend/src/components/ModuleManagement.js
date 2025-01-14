import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import { Box, Button, Typography, TextField, Select, MenuItem, Card, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";

const BASE_URL = "http://localhost:8000";

const ModuleManagement = () => {
  const [modules, setModules] = useState([]);
  const [moduleData, setModuleData] = useState({
    title: "",
    description: "",
    prerequisite_mod: null,
    version: 1,
  });

  // Fetch all modules
  const fetchModules = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/modules`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      console.log("Fetched modules:", res.data);
      setModules(res.data);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  // Handle module creation
  const createModule = async (e) => {
    e.preventDefault();
    console.log("Creating module with data:", moduleData); // Debugging

    try {
      await axios.post(`${BASE_URL}/admin/modules`, moduleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      console.log("Module created successfully");
      fetchModules(); // Refresh the list
      setModuleData({ title: "", description: "", prerequisite_mod: null, version: 1 });
    } catch (error) {
      console.error("Error creating module:", error.response?.data || error.message);
    }
  };

  // Handle module deletion
  const deleteModule = async (moduleId) => {
    try {
      await axios.delete(`${BASE_URL}/admin/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      fetchModules();
    } catch (error) {
      console.error("Error deleting module:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <Sidebar userType="admin" />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          backgroundColor: "#f5f5f5",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: "20px" }}>
          Module Management
        </Typography>

        {/* Module Creation Form */}
        <Card
          component="form"
          onSubmit={createModule}
          sx={{
            maxWidth: "400px",
            margin: "0 auto",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            marginBottom: "30px",
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: "20px", textAlign: "center" }}>
            Create a New Module
          </Typography>
          <TextField
            fullWidth
            label="Title"
            value={moduleData.title}
            onChange={(e) => setModuleData({ ...moduleData, title: e.target.value })}
            required
            sx={{ marginBottom: "15px" }}
          />
          <TextField
            fullWidth
            label="Description"
            value={moduleData.description}
            onChange={(e) => setModuleData({ ...moduleData, description: e.target.value })}
            required
            multiline
            rows={3}
            sx={{ marginBottom: "15px" }}
          />
          <Select
            fullWidth
            value={moduleData.prerequisite_mod || ""}
            onChange={(e) =>
              setModuleData({ ...moduleData, prerequisite_mod: e.target.value || null })
            }
            displayEmpty
            sx={{ marginBottom: "15px" }}
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
          <Button variant="contained" color="primary" type="submit" fullWidth>
            Create Module
          </Button>
        </Card>

        {/* Module List */}
        <Box>
          <Typography variant="h6" sx={{ marginBottom: "20px" }}>
            Existing Modules
          </Typography>
          {modules.map((module) => (
            <Card
              key={module.module_id}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px",
                borderRadius: "10px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                marginBottom: "20px",
              }}
            >
              <Box>
                <Typography variant="h6">{module.title}</Typography>
                <Typography>{module.description}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <IconButton
                  color="primary"
                  onClick={() => console.log("Add Lesson Clicked", module.module_id)}
                >
                  <AddIcon />
                </IconButton>
                <IconButton
                  color="secondary"
                  onClick={() => console.log("Edit Module Clicked", module.module_id)}
                >
                  <EditIcon />
                </IconButton>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => deleteModule(module.module_id)}
                >
                  Delete
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ModuleManagement;
