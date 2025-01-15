import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  IconButton,
  Modal,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://localhost:8000";

const ModuleManagement = () => {
  const [modules, setModules] = useState([]);
  const [moduleData, setModuleData] = useState({
    title: "",
    description: "",
    prerequisite_mod: null,
    version: 1,
  });
  const [selectedLanguage, setSelectedLanguage] = useState("en"); // Default to American Sign Language
  const [selectedModule, setSelectedModule] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Check authentication
  const checkAuth = () => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      navigate("/login");
    }
  };

  // Fetch all modules for the selected language
  const fetchModules = async () => {
    if (!isAuthenticated) return;

    try {
      const res = await axios.get(`${BASE_URL}/admin/modules?language=${selectedLanguage}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setModules(res.data);
    } catch (error) {
      if (error.response?.status === 401) {
        // Redirect to login if unauthorized
        localStorage.removeItem("authToken");
        setIsAuthenticated(false);
        navigate("/login");
      } else {
        console.error("Error fetching modules:", error);
      }
    }
  };

  // Handle module creation
  const createModule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${BASE_URL}/admin/modules`,
        { ...moduleData, language: selectedLanguage },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }
      );
      fetchModules();
      setModuleData({ title: "", description: "", prerequisite_mod: null, version: 1 });
    } catch (error) {
      console.error("Error creating module:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchModules();
  }, [isAuthenticated, selectedLanguage]);

  if (!isAuthenticated) {
    return <Typography>Loading...</Typography>;
  }

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
          background: "linear-gradient(to bottom, white, #E6DFFF)",
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: "20px" }}>
        
        </Typography>

                {/* Language Selector */}
                <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "20px",
            gap: "15px",
          }}
        >
          {/* American Sign Language */}
          <Button
            onClick={() => setSelectedLanguage("en")}
            sx={{
              padding: 0,
              border: selectedLanguage === "en" ? "3px solid #5b21b6" : "3px solid transparent",
              borderRadius: "50%",
              boxShadow: selectedLanguage === "en" ? "0 4px 8px rgba(91, 33, 182, 0.5)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease-in-out",
            }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg"
              alt="American Sign Language"
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                border: "2px solid #e5e7eb",
              }}
            />
          </Button>

          {/* Polish Sign Language */}
          <Button
            onClick={() => setSelectedLanguage("pl")}
            sx={{
              padding: 0,
              border: selectedLanguage === "pl" ? "3px solid #5b21b6" : "3px solid transparent",
              borderRadius: "50%",
              boxShadow: selectedLanguage === "pl" ? "0 4px 8px rgba(91, 33, 182, 0.5)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease-in-out",
            }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/en/1/12/Flag_of_Poland.svg"
              alt="Polish Sign Language"
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                border: "2px solid #e5e7eb",
              }}
            />
          </Button>

          {/* Russian Sign Language */}
          <Button
            onClick={() => setSelectedLanguage("ru")}
            sx={{
              padding: 0,
              border: selectedLanguage === "ru" ? "3px solid #5b21b6" : "3px solid transparent",
              borderRadius: "50%",
              boxShadow: selectedLanguage === "ru" ? "0 4px 8px rgba(91, 33, 182, 0.5)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease-in-out",
            }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg"
              alt="Russian Sign Language"
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                border: "2px solid #e5e7eb",
              }}
            />
          </Button>
        </Box>

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
          <Button
            sx={{
              backgroundColor: "#5b21b6",
              color: "#fff",
              "&:hover": {
                backgroundColor: "#4a148c",
              },
            }}
            type="submit"
            fullWidth
          >
            Create Module
          </Button>
        </Card>

        {/* Module List */}
        <Box>
          <Typography variant="h6" sx={{ marginBottom: "20px" }}>
            Existing Modules for{" "}
            {selectedLanguage === "en"
              ? "American"
              : selectedLanguage === "pl"
              ? "Polish"
              : "Russian"}{" "}
            Sign Language
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
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ModuleManagement;
