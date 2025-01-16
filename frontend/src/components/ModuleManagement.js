import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { FormControl, InputLabel, NativeSelect } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  Modal,
  Fab,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

const BASE_URL = "http://localhost:8000";

const ModuleManagement = () => {
  const [modules, setModules] = useState([]);
  const [moduleData, setModuleData] = useState({
    title: "",
    description: "",
    prerequisite_mod: null,
    version: 1,
  });
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null); 
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState({ code: "", name: "" });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const navigate = useNavigate();


  //dialog handling
const openDeleteDialog = (module) => {
  setModuleToDelete(module);
  setIsDeleteDialogOpen(true);
};

const closeDeleteDialog = () => {
  setIsDeleteDialogOpen(false);
  setModuleToDelete(null);
};

const handleDeleteModule = async () => {
  if (!moduleToDelete) return;

  try {
    await axios.delete(`${BASE_URL}/admin/modules/${moduleToDelete.module_id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    });
    fetchModules(); 
    closeDeleteDialog(); 
  } catch (error) {
    console.error("Error deleting module:", error.response?.data || error.message);
  }
};

  // Check authentication
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      navigate("/login");
    }
  }, [navigate]);

  // Fetch all available languages from the backend
  const fetchLanguages = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/languages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setLanguages(res.data);
      if (res.data.length > 0) {
        setSelectedLanguage(res.data[0].id); // Default to the first language
      }
    } catch (error) {
      console.error("Error fetching languages:", error.response?.data || error.message);
    }
  }, []);


  const createLanguage = async () => {
    if (!newLanguage.code || !newLanguage.name) {
      console.error("Language code or name is missing.");
      return;
    }
  
    try {
      const response = await axios.post(
        `${BASE_URL}/admin/languages`,
        {
          code: newLanguage.code,
          name: newLanguage.name,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }
      );
  
      console.log("Language created successfully:", response.data);
  
      
      setIsModalOpen(false);
  
      
      setNewLanguage({ code: "", name: "" });
  
      
      fetchLanguages();
    } catch (error) {
      console.error(
        "Error creating language:",
        error.response?.data || error.message
      );
    }
  };
  


  // Fetch all modules for the selected language
  const fetchModules = useCallback(async () => {
    if (!isAuthenticated || !selectedLanguage) return;

    try {
      const res = await axios.get(
        `${BASE_URL}/admin/modules?language_id=${selectedLanguage}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }
      );
      setModules(res.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("authToken");
        setIsAuthenticated(false);
        navigate("/login");
      } else {
        console.error("Error fetching modules:", error);
      }
    }
  }, [isAuthenticated, selectedLanguage, navigate]);

  
 // Function to map language codes to their respective flag URLs
 const getFlagUrl = (code) => {
  if (!code) {
    return "https://upload.wikimedia.org/wikipedia/commons/6/66/Unknown_flag.svg"; 
  }

  if (code.toLowerCase() === "en") {
    console.log("Special case: Language code 'en' mapped to the US flag.");
    return "https://flagcdn.com/w320/us.png"; 
  }

  const sanitizedCode = code.toLowerCase();

  // Generate flag URL dynamically
  const flagUrl = `https://flagcdn.com/w320/${sanitizedCode}.png`;
  return flagUrl;
};


// Handle module update
const updateModule = async (e) => {
  e.preventDefault();
  if (!selectedModule) {
    console.error("No module selected for updating.");
    return;
  }
  try {
    await axios.put(
      `${BASE_URL}/admin/modules/${selectedModule.module_id}`,
      selectedModule,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      }
    );
    fetchModules();
    setIsEditModalOpen(false); 
    setSelectedModule(null); 
  } catch (error) {
    console.error("Error updating module:", error.response?.data || error.message);
  }
};

// Handle module deletion
const deleteModule = async (moduleId) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this module?");
  if (!confirmDelete) return;

  try {
    await axios.delete(`${BASE_URL}/admin/modules/${moduleId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    });
    fetchModules();
    console.log(`Module ${moduleId} deleted successfully.`);
  } catch (error) {
    console.error("Error deleting module:", error.response?.data || error.message);
  }
};



  // Handle module creation
  const createModule = async (e) => {
    e.preventDefault();
    if (!selectedLanguage) {
      console.error("No language selected.");
      return;
    }
    try {
      await axios.post(
        `${BASE_URL}/admin/modules`,
        { ...moduleData, language_id: selectedLanguage },
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
    fetchLanguages();
  }, [checkAuth, fetchLanguages]);

  useEffect(() => {
    fetchModules();
  }, [selectedLanguage, isAuthenticated, fetchModules]);

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
          Module Management
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
  {languages.map((language) => (
    <Button
      key={language.id}
      onClick={() => setSelectedLanguage(language.id)}
      sx={{
        padding: 0,
        border:
          selectedLanguage === language.id
            ? "3px solid #5b21b6"
            : "3px solid transparent",
        borderRadius: "3px",
        boxShadow:
          selectedLanguage === language.id
            ? "0 4px 8px rgba(91, 33, 182, 0.5)"
            : "0 2px 4px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease-in-out",
      }}
    >
      <img
        src={getFlagUrl(language.code)}
        alt={`${language.name} Flag`}
        style={{
          width: "75px",
          height: "50px",
          border: "2px solid #e5e7eb",
        }}
      />
    </Button>
  ))}

  {/* Floating Action Button for Adding New Language */}
  <Fab
    color="primary"
    aria-label="add"
    onClick={() => setIsModalOpen(true)} 
    sx={{
      backgroundColor: "#5b21b6",
      "&:hover": {
        backgroundColor: "#4a148c",
      },
    }}
  >
    <AddIcon />
  </Fab>
</Box>

{/* Modal for Adding New Language */}
<Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
  <Box
    sx={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      width: "300px",
    }}
  >
    <Typography variant="h6" sx={{ textAlign: "center", marginBottom: "20px" }}>
      Add New Language
    </Typography>
    <TextField
      fullWidth
      label="Language Code (e.g., 'fr' for French)"
      value={newLanguage.code}
      onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
      sx={{ marginBottom: "15px" }}
    />
    <TextField
      fullWidth
      label="Language Name (e.g., 'French')"
      value={newLanguage.name}
      onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
      sx={{ marginBottom: "15px" }}
    />
    <Button
      onClick={createLanguage}
      fullWidth
      sx={{
        backgroundColor: "#5b21b6",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#4a148c",
        },
      }}
    >
      Add Language
    </Button>
  </Box>
</Modal>

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
{/* Prerequisite Module Dropdown */}


<TextField
  select
  fullWidth
  label="Prerequisite Module"
  value={moduleData.prerequisite_mod || ""} 
  onChange={(e) =>
    setModuleData({ ...moduleData, prerequisite_mod: e.target.value })
  }
  sx={{
    marginBottom: "15px",
    "& .MuiInputBase-root": {
      lineHeight: "1.5", 
    },
    "& .MuiSelect-select": {
      padding: "10px 14px",
    },
  }}
  SelectProps={{
    native: true, 
  }}
>
  <option value="" disabled>
  </option>
  <option value="none">None</option> {/* Explicit "None" option */}
  {modules.map((module) => (
    <option key={module.module_id} value={module.module_id}>
      {module.title}
    </option>
  ))}
</TextField>


  <Button
    sx={{
      backgroundColor: "#5b21b6",
      color: "#fff",
      "&:hover": { backgroundColor: "#4a148c" },
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
    {languages.find((lang) => lang.id === selectedLanguage)?.name || "Selected"}{" "}
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
      <Box sx={{ display: "flex", gap: "10px" }}>
        {/* Add Lesson Button */}
        <Fab
          size="small"
          onClick={() => console.log(`Add lesson to module ${module.module_id}`)}
          sx={{
            backgroundColor: "#5b21b6",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#4a148c",
            },
          }}
        >
          <AddIcon />
        </Fab>

        {/* Edit Module Button */}
        <Fab
          size="small"
          onClick={() => {
            setSelectedModule(module); 
            setIsEditModalOpen(true);
          }}
          sx={{
            backgroundColor: "#5b21b6",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#4a148c",
            },
          }}
        >
          <EditIcon />
        </Fab>

        {/* Delete Module Button */}
<Fab
  size="small"
  onClick={() => openDeleteDialog(module)} 
  sx={{
    backgroundColor: "#5b21b6",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#4a148c",
    },
  }}
>
  <DeleteIcon />
</Fab>

{/* Dialog Component */}
<Dialog
  open={isDeleteDialogOpen}
  onClose={closeDeleteDialog}
  aria-labelledby="delete-dialog-title"
  aria-describedby="delete-dialog-description"
>
  <DialogTitle id="delete-dialog-title">Delete Module</DialogTitle>
  <DialogContent>
    <DialogContentText id="delete-dialog-description">
      Are you sure you want to delete the module{" "}
      <strong>{moduleToDelete?.title}</strong>? This action cannot be undone.
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={closeDeleteDialog} sx={{ color: "#5b21b6" }}>
      Cancel
    </Button>
    <Button
      onClick={handleDeleteModule} 
      sx={{
        backgroundColor: "#5b21b6",
        color: "#fff",
        "&:hover": { backgroundColor: "#4a148c" },
      }}
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>

      </Box>
    </Card>
  ))}
</Box>

{/* Modal for Editing Module */}
<Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
  <Box
    sx={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      width: "400px",
    }}
  >
    <Typography variant="h6" sx={{ textAlign: "center", marginBottom: "20px" }}>
      Edit Module
    </Typography>
    <TextField
      fullWidth
      label="Title"
      value={selectedModule?.title || ""}
      onChange={(e) =>
        setSelectedModule({ ...selectedModule, title: e.target.value })
      }
      sx={{ marginBottom: "15px" }}
    />
    <TextField
      fullWidth
      label="Description"
      value={selectedModule?.description || ""}
      onChange={(e) =>
        setSelectedModule({ ...selectedModule, description: e.target.value })
      }
      sx={{ marginBottom: "15px" }}
    />
    <Button
      onClick={updateModule}
      fullWidth
      sx={{
        backgroundColor: "#5b21b6",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#4a148c",
        },
      }}
    >
      Update Module
    </Button>
  </Box>
</Modal>

      </Box>
    </Box>
  );
};

export default ModuleManagement;
