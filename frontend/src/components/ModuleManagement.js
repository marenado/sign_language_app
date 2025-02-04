import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import Tooltip from "@mui/material/Tooltip";
import '../index.css';
import { Menu, MenuItem, IconButton } from "@mui/material";
// import { FormControl, InputLabel, NativeSelect } from "@mui/material";
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

const BASE_URL = "https://signlearn.onrender.com";

const ModuleManagement = () => {
  // State hooks
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState({});
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
  const menuShouldClose = useRef(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState({ code: "", name: "" });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [tasks, setTasks] = useState({});
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskData, setTaskData] = useState({
    task_type: "",
    content: {},
    correct_answer: {},
    points: 1,
    version: 1,
  });
  
  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "400px",
    backgroundColor: "white",
    border: "2px solid #ccc",
    boxShadow: 24,
    padding: "20px",
    borderRadius: "10px",
  };
  
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [editLessonModalOpen, setEditLessonModalOpen] = useState(false);
  const [lessonToEdit, setLessonToEdit] = useState({
    title: "",
    description: "",
    duration: null,
    difficulty: "",
  });

  const [videoSearchQuery, setVideoSearchQuery] = useState("");
  const [videoSearchResults, setVideoSearchResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [newLesson, setNewLesson] = useState({
    title: "",          // Empty string as it's a required field
    description: "",    // Empty string as it's a required field
    version: 1,         // Default to 1
    duration: null,     // Set to null initially (optional)
    difficulty: "Beginner", // Default to "Beginner"
    module_id: null     // Set to null until a module is selected
});


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



const openMenu = (event, lessonId) => {
  menuShouldClose.current = true; // Allow menu to close by default
  setMenuAnchor(event.currentTarget);
  setActiveLessonId(lessonId);
};

const closeMenu = () => {
  if (!menuShouldClose.current) {
    // console.log("Preventing menu close.");
    return;
  }
  setMenuAnchor(null);
  setActiveLessonId(null);
};



const openEditLessonModal = (lesson) => {
  // console.log("Opening edit modal for lesson:", lesson);
  setActiveLessonId(lesson.lesson_id); // Set active ID for the lesson being edited
  setLessonToEdit({
    title: lesson.title || "",
    description: lesson.description || "",
    duration: lesson.duration || null,
    difficulty: lesson.difficulty || "",
  });
  setEditLessonModalOpen(true);
};

  
  
const closeEditLessonModal = () => {
  // console.log("Closing edit lesson modal.");
  setEditLessonModalOpen(false);
  setActiveLessonId(null); // Reset only after edit is done
};

  
  
  

  const handleDeleteLesson = async () => {
    if (!activeLessonId) {
      // console.error("No active lesson ID set for deletion.");
      return;
    }
  
    // console.log(`Attempting to delete lesson with ID: ${activeLessonId}`); // Debug log
  
    // Add the "removing" class to trigger the fade-out animation
    const lessonElement = document.getElementById(`lesson-${activeLessonId}`);
    if (lessonElement) {
      lessonElement.classList.add("removing"); // Add the removing class
    }
  
    // Wait for the animation to complete (300ms in this case)
    setTimeout(async () => {
      try {
        // Send the delete request
        await axios.delete(`${BASE_URL}/admin/lessons/${activeLessonId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        });
        console.log(`Lesson ${activeLessonId} deleted successfully.`);
  
        // Update the local state to remove the deleted lesson
        setLessons((prevLessons) => {
          if (!selectedModule || !prevLessons[selectedModule.module_id]) return prevLessons;
  
          const updatedModuleLessons = prevLessons[selectedModule.module_id].filter(
            (lesson) => lesson.lesson_id !== activeLessonId
          );
  
          return {
            ...prevLessons,
            [selectedModule.module_id]: updatedModuleLessons,
          };
        });
  
        closeMenu(); // Close any related menus after deletion
      } catch (error) {
        console.error(
          `Error deleting lesson ${activeLessonId}:`,
          error.response?.data || error.message
        );
      }
    }, 300); // Match the animation duration
  };
  
  
  

  const handleEditLesson = async () => {
    if (!activeLessonId) {
      // console.error("No active lesson ID is set for updating.");
      return;
    }
  
    // Fallback to find the module if `selectedModule` is null
    const currentModule =
      selectedModule ||
      modules.find((module) =>
        lessons[module.module_id]?.some(
          (lesson) => lesson.lesson_id === activeLessonId
        )
      );
  
    if (!currentModule || !currentModule.module_id) {
      // console.error("No module selected or module_id is missing.");
      return;
    }
  
    const payload = {
      title: lessonToEdit.title || undefined,
      description: lessonToEdit.description || undefined,
      duration: lessonToEdit.duration || undefined,
      difficulty: lessonToEdit.difficulty || undefined,
    };
  
    try {
      const response = await axios.put(
        `${BASE_URL}/admin/lessons/${activeLessonId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }
      );
      // console.log("Lesson updated successfully:", response.data);
  
      // Update lessons state
      setLessons((prevLessons) => {
        const updatedLessons = prevLessons[currentModule.module_id]?.map(
          (lesson) =>
            lesson.lesson_id === activeLessonId
              ? { ...lesson, ...response.data }
              : lesson
        );
        return { ...prevLessons, [currentModule.module_id]: updatedLessons };
      });
  
      closeEditLessonModal();
    } catch (error) {
      // console.error("Error updating lesson:", error.response?.data || error.message);
    }
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
    // console.error("Error deleting module:", error.response?.data || error.message);
  }
};

const openLessonModal = (module) => {
  setSelectedModule(module);
  setIsLessonModalOpen(true);
};

// Handle closing the lesson modal
const closeLessonModal = () => {
  setIsLessonModalOpen(false);
  setNewLesson({ title: "", description: "", difficulty: "", duration: null });
};




const searchVideos = async () => {
  if (!videoSearchQuery.trim()) return; // Skip if search query is empty

  try {
    const res = await axios.get(`${BASE_URL}/admin/videos?search=${videoSearchQuery}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    });
    setVideoSearchResults(res.data);
  } catch (error) {
    // console.error("Error fetching videos:", error.response?.data || error.message);
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
      // console.error("Error fetching languages:", error.response?.data || error.message);
    }
  }, []);


  const createLesson = async () => {
    if (!selectedModule || !selectedModule.module_id) {
        // console.error("No module selected.");
        return;
    }

    // Add a short delay to ensure state updates are completed
    setTimeout(async () => {
        const lessonData = {
            ...newLesson,
            duration: newLesson.duration || 0,
            difficulty: newLesson.difficulty || "Beginner",
            module_id: selectedModule.module_id,
        };

        // console.log("Lesson data to be sent:", lessonData);

        try {
            const response = await axios.post(`${BASE_URL}/admin/lessons`, lessonData, {
                headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
            });
            // console.log("Lesson created successfully:", response.data);
            await fetchLessons(selectedModule.module_id);
            closeLessonModal();
        } catch (error) {
            // console.error("Error creating lesson:", error.response?.data || error.message);
        }
    }, 0);
};

 


  const createLanguage = async () => {
    if (!newLanguage.code || !newLanguage.name) {
      // console.error("Language code or name is missing.");
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
  
      // console.log("Language created successfully:", response.data);
  
      
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
      const modulesData = res.data;
      setModules(modulesData);
  
      // Fetch lessons for each module
      modulesData.forEach((module) => {
        fetchLessons(module.module_id);
      });
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


  const fetchLessons = async (moduleId) => {
    if (!moduleId) {
      console.error("Module ID is required to fetch lessons.");




      return;
    }
  
    // console.log(`Fetching lessons for module ID: ${moduleId}`); // Debug log
  
    try {
      const response = await axios.get(`${BASE_URL}/admin/lessons?module_id=${moduleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setLessons((prevLessons) => ({
        ...prevLessons,
        [moduleId]: response.data,s
      }));
      // console.log(`Lessons fetched for module ${moduleId}:`, response.data);
    } catch (error) {
      console.error(`Error fetching lessons for module ${moduleId}:`, error.response?.data || error.message);
    }
  };
  

  const fetchTasks = async (lessonId) => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/tasks?lesson_id=${lessonId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setTasks((prev) => ({ ...prev, [lessonId]: res.data }));
    } catch (error) {
      console.error(`Error fetching tasks for lesson ${lessonId}:`, error.response?.data || error.message);
    }
  };
  

  
 // Function to map language codes to their respective flag URLs
 const getFlagUrl = (code) => {
  if (!code) {
    return "https://upload.wikimedia.org/wikipedia/commons/6/66/Unknown_flag.svg"; 
  }

  if (code.toLowerCase() === "en") {
    // console.log("Special case: Language code 'en' mapped to the US flag.");
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


const createTask = async () => {
  if (!selectedLesson) {
    console.error("No lesson selected.");
    return;
  }
  try {
    await axios.post(
      `${BASE_URL}/admin/tasks`,
      { ...taskData, lesson_id: selectedLesson.lesson_id, video_id: selectedVideo?.video_id },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      }
    );
    fetchTasks(selectedLesson.lesson_id);
    setIsTaskModalOpen(false);
    setTaskData({ task_type: "", content: {}, correct_answer: {}, points: 1, version: 1 });
    setSelectedVideo(null);
  } catch (error) {
    console.error("Error creating task:", error.response?.data || error.message);
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


  useEffect(() => {
    // console.log("activeLessonId changed:", activeLessonId);
  }, [activeLessonId]);

  useEffect(() => {
    // console.log("selectedModule changed:", selectedModule);
  }, [selectedModule]);
  
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
       //   background: "linear-gradient(to bottom right, white, #E6DFFF)",
        }}
      >
        {/* <Typography variant="h4" sx={{ fontWeight: "bold", marginBottom: "20px", textAlign: "center" }}>
          Module Management
        </Typography> */}

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
  <Typography variant="h6" sx={{ marginBottom: "20px", color: "#000000", fontWeight: "bold" }}>
    Existing Modules for{" "}
    {languages.find((lang) => lang.id === selectedLanguage)?.name || "Selected"}{" "}
    Sign Language
  </Typography>
  {modules.map((module) => (
    <Card
      key={module.module_id}
      sx={{
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 4px 8px rgba(91, 33, 182, 0.2)",
        marginBottom: "20px",
        backgroundColor: "#f3e8ff", // Subtle violet background
      }}
    >
      {/* Module Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "15px",
        }}

        // onClick={() => navigate(`/admin/lessons/${lesson.lesson_id}/tasks`)} 
      >
        <Box>
          <Typography variant="h6" sx={{ color: "#000000", fontWeight: "bold" }}>
            {module.title}
          </Typography>
          <Typography sx={{ color: "#6b7280" }}>{module.description}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: "10px" }}>
          {/* Add Lesson Button */}
{/* Add Lesson Button */}
<Tooltip title="Add a new lesson" arrow>
    <Fab
      size="small"
      onClick={() => {
        setSelectedModule(module); // Select the current module
        setIsLessonModalOpen(true); // Open the modal
      }}
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
  </Tooltip>
{/* Edit Module Button */}
<Tooltip title="Edit this module" arrow>
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
</Tooltip>

{/* Delete Module Button */}
<Tooltip title="Delete this module" arrow>
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
</Tooltip>

        </Box>

       {/* Modal for Adding a Lesson */}
<Modal open={isLessonModalOpen} onClose={closeLessonModal}>
  <Box
    sx={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "400px",
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    }}
  >
    <Typography variant="h6" sx={{ marginBottom: "20px", textAlign: "center" }}>
      Add New Lesson
    </Typography>
    <TextField
      fullWidth
      label="Title"
      value={newLesson.title}
      onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
      sx={{ marginBottom: "15px" }}
    />
    <TextField
      fullWidth
      label="Description"
      multiline
      rows={3}
      value={newLesson.description}
      onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
      sx={{ marginBottom: "15px" }}
    />
    <TextField
      fullWidth
      label="Difficulty"
      value={newLesson.difficulty}
      onChange={(e) => setNewLesson({ ...newLesson, difficulty: e.target.value })}
      sx={{ marginBottom: "15px" }}
    />
    <TextField
      fullWidth
      label="Duration (minutes)"
      type="number"
      value={newLesson.duration || ""}
      onChange={(e) => setNewLesson({ ...newLesson, duration: Number(e.target.value) })}
      sx={{ marginBottom: "15px" }}
    />
    <Button
      variant="contained"
      //color="primary"
      onClick={createLesson} // Call the function to create a lesson
      sx={{ display: "block",backgroundColor: "#5b21b6",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#4a148c",
        }, marginLeft: "auto", marginRight: "auto" }}
    >
      Save Lesson
    </Button>
  </Box>
</Modal>
      </Box>



{/* Lesson List */}
<Box
  sx={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", // Responsive grid layout
    gap: "20px",
    marginTop: "20px",
    padding: "20px",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Improved shadow for better contrast
    position: "relative", // For positioning the Fab button
    //boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", // Improved shadow for better contrast
    position: "relative", // For positioning the Fab button
    gridAutoRows: "minmax(100px, auto)", // Automatically adjust row height
    transition: "all 0.3s ease",
  }}
>
{lessons[module.module_id]?.length > 0 ? (
  lessons[module.module_id].map((lesson) => (
    <Card
      key={lesson.lesson_id}
      id={`lesson-${lesson.lesson_id}`}
      className="lesson-card"
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textAlign: "left",
        padding: "20px",
        borderRadius: "10px",
        backgroundColor: "#e9d5ff",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        height: "200px",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "scale(1.05)",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        },
        position: "relative",
        cursor: "pointer", // Ensures a pointer cursor for better UX
      }}
      onClick={() => navigate(`/admin/lessons/${lesson.lesson_id}/tasks`)} // Navigate to lesson management
    >
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: "#4a148c",
            marginBottom: "10px",
            whiteSpace: "normal",
            overflow: "visible",
            textAlign: "left",
          }}
        >
          {lesson.title}
        </Typography>

        {/* Menu Button */}
        <IconButton
          aria-label="settings"
          onClick={(event) => {
            event.stopPropagation(); // Prevents the Card's onClick from being triggered
            openMenu(event, lesson.lesson_id); // Opens the menu
          }}
          sx={{
            color: "#4a148c",
            "&:hover": { color: "#5b21b6" },
          }}
        >
          <MoreVertIcon />
        </IconButton>

        {/* Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor) && activeLessonId === lesson.lesson_id}
          onClose={closeMenu}
          sx={{
            "& .MuiPaper-root": {
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            },
          }}
        >
          <MenuItem
            onClick={() => {
              menuShouldClose.current = false; // Prevent menu from closing
              // console.log("Edit Lesson clicked for ID:", lesson.lesson_id);
              openEditLessonModal(lesson);
            }}
          >
            Edit Lesson
          </MenuItem>
          <MenuItem
            onClick={() => {
              setActiveLessonId(lesson.lesson_id); // Set the correct lesson ID
              handleDeleteLesson(); // Trigger delete function
              closeMenu();
            }}
          >
            Delete Lesson
          </MenuItem>
        </Menu>
      </Box>

      {/* Description */}
      <Typography
        variant="body2"
        sx={{
          color: "#6b7280",
          marginTop: "10px",
          marginBottom: "10px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2, // Limit to 2 lines
          WebkitBoxOrient: "vertical",
        }}
      >
        {lesson.description || "No description provided."}
      </Typography>

      {/* Footer Section */}
      <Typography
        variant="caption"
        sx={{
          color: "#6b7280",
          fontStyle: "italic",
        }}
      >
        Difficulty: {lesson.difficulty || "N/A"} | Duration: {lesson.duration || "N/A"} mins
      </Typography>
    </Card>
  ))
) : (
  <Typography
    variant="body2"
    sx={{
      color: "#6b7280",
      textAlign: "center",
      gridColumn: "span 3", // Span full width when no lessons are present
    }}
  >
    No lessons available for this module.
  </Typography>
)}

</Box>

{/* Edit Lesson Modal */}
{editLessonModalOpen && (
  <Modal
    open={editLessonModalOpen}
    onClose={closeEditLessonModal}
    aria-labelledby="edit-lesson-modal-title"
    aria-describedby="edit-lesson-modal-description"
  >
    <Box sx={{ ...modalStyle }}>
      <Typography id="edit-lesson-modal-title" variant="h6">
        Edit Lesson
      </Typography>
      <TextField
        label="Title"
        value={lessonToEdit.title}
        onChange={(e) =>
          setLessonToEdit((prev) => ({ ...prev, title: e.target.value }))
        }
        fullWidth
        margin="normal"
      />
      <TextField
        label="Description"
        value={lessonToEdit.description}
        onChange={(e) =>
          setLessonToEdit((prev) => ({ ...prev, description: e.target.value }))
        }
        fullWidth
        margin="normal"
      />
      <TextField
        label="Duration (mins)"
        type="number"
        value={lessonToEdit.duration}
        onChange={(e) =>
          setLessonToEdit((prev) => ({ ...prev, duration: e.target.value }))
        }
        fullWidth
        margin="normal"
      />
      <TextField
        label="Difficulty"
        value={lessonToEdit.difficulty}
        onChange={(e) =>
          setLessonToEdit((prev) => ({ ...prev, difficulty: e.target.value }))
        }
        fullWidth
        margin="normal"
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "20px",
        }}
      >
        <Button onClick={closeEditLessonModal} variant="outlined" color="secondary">
          Cancel
        </Button>
        <Button
  onClick={() => handleEditLesson(activeLessonId)}
  variant="contained"
  sx={{
    backgroundColor: "#5b21b6",
    color: "#fff",
    "&:hover": { backgroundColor: "#4a148c" },
  }}
>
  Save Changes
</Button>




      </Box>
    </Box>
  </Modal>
)}




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

<Modal open={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)}>
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
      width: "500px",
    }}
  >
    <Typography variant="h6" sx={{ textAlign: "center", marginBottom: "20px" }}>
      {taskData.task_id ? "Edit Task" : "Create Task"}
    </Typography>

    {/* Task Type Selector */}
    <TextField
      select
      fullWidth
      label="Task Type"
      value={taskData.task_type}
      onChange={(e) => setTaskData({ ...taskData, task_type: e.target.value })}
      sx={{ marginBottom: "15px" }}
      SelectProps={{ native: true }}
    >
      <option value="">Select Task Type</option>
      <option value="multiple_choice">Multiple Choice</option>
      <option value="matching">Matching</option>
      <option value="typing">Typing</option>
    </TextField>

    {/* Video Search */}
    <TextField
      fullWidth
      label="Search Videos"
      value={videoSearchQuery}
      onChange={(e) => setVideoSearchQuery(e.target.value)}
      sx={{ marginBottom: "10px" }}
    />
    <Button onClick={searchVideos} sx={{ marginBottom: "15px" }}>
      Search
    </Button>

    {/* Video Results */}
    <Box sx={{ maxHeight: "200px", overflowY: "auto", marginBottom: "15px" }}>
      {videoSearchResults.map((video) => (
        <Box
          key={video.video_id}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
            marginBottom: "5px",
            cursor: "pointer",
            backgroundColor:
              selectedVideo?.video_id === video.video_id ? "#ddd" : "#fff",
          }}
          onClick={() => setSelectedVideo(video)}
        >
          <Typography>{video.gloss}</Typography>
          <video src={video.video_url} width="100" controls />
        </Box>
      ))}
    </Box>

    {/* Task Content */}
    {taskData.task_type === "multiple_choice" && (
      <TextField
        fullWidth
        label="Options (JSON format)"
        value={JSON.stringify(taskData.content.options || [])}
        onChange={(e) =>
          setTaskData({
            ...taskData,
            content: { ...taskData.content, options: JSON.parse(e.target.value) },
          })
        }
        sx={{ marginBottom: "15px" }}
      />
    )}

    {/* Correct Answer */}
    <TextField
      fullWidth
      label="Correct Answer (JSON format)"
      value={JSON.stringify(taskData.correct_answer)}
      onChange={(e) =>
        setTaskData({
          ...taskData,
          correct_answer: JSON.parse(e.target.value),
        })
      }
      sx={{ marginBottom: "15px" }}
    />

    {/* Save Task */}
    <Button
      onClick={createTask}
      fullWidth
      sx={{
        backgroundColor: "#5b21b6",
        color: "#fff",
        "&:hover": { backgroundColor: "#4a148c" },
      }}
    >
      Save Task
    </Button>
  </Box>
</Modal>



      </Box>
    </Box>
  );
};



export default ModuleManagement;

