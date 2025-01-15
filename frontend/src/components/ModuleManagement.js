import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import { Box, Button, Typography, TextField, Select, MenuItem, Card, IconButton, Modal } from "@mui/material";
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
  const [selectedModule, setSelectedModule] = useState(null); // Module being edited
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for modal visibility

  // Fetch all modules
  const fetchModules = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/modules`, {
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
      await axios.post(`${BASE_URL}/admin/modules`, moduleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      fetchModules();
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

  // Open Edit Modal
  const openEditModal = (module) => {
    setSelectedModule(module);
    setIsEditModalOpen(true);
  };

  // Close Edit Modal
  const closeEditModal = () => {
    setSelectedModule(null);
    setIsEditModalOpen(false);
  };

  // Handle module update
  const updateModule = async (e) => {
    e.preventDefault();
    if (!selectedModule) return;

    try {
      await axios.put(`${BASE_URL}/admin/modules/${selectedModule.module_id}`, selectedModule, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      fetchModules();
      closeEditModal();
    } catch (error) {
      console.error("Error updating module:", error.response?.data || error.message);
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
                  color="secondary"
                  onClick={() => openEditModal(module)}
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

        {/* Edit Module Modal */}
        <Modal
          open={isEditModalOpen}
          onClose={closeEditModal}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Card
            component="form"
            onSubmit={updateModule}
            sx={{
              maxWidth: "400px",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography variant="h6" sx={{ marginBottom: "20px", textAlign: "center" }}>
              Edit Module
            </Typography>
            <TextField
              fullWidth
              label="Title"
              value={selectedModule?.title || ""}
              onChange={(e) =>
                setSelectedModule({ ...selectedModule, title: e.target.value })
              }
              required
              sx={{ marginBottom: "15px" }}
            />
            <TextField
              fullWidth
              label="Description"
              value={selectedModule?.description || ""}
              onChange={(e) =>
                setSelectedModule({ ...selectedModule, description: e.target.value })
              }
              required
              multiline
              rows={3}
              sx={{ marginBottom: "15px" }}
            />
            <Button variant="contained" color="primary" type="submit" fullWidth>
              Save Changes
            </Button>
          </Card>
        </Modal>
      </Box>
    </Box>
  );
};

export default ModuleManagement;
