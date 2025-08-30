import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Edit, Delete } from "@mui/icons-material";
import api from "../services/api";
import {
  Box,
  Card,
  Typography,
  Button,
  Modal,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";



const TaskList = () => {
  const { lessonId } = useParams(); // Get the lesson ID from the URL
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTypeOptions] = useState([
    "video_recognition",
    "video_to_sign",
    "matching",
    "gesture_replication",
    "sign_speed_challenge",
    "sign_presentation", // New task type
  ]);
  const [taskData, setTaskData] = useState({
    task_type: "",
    content: {},
    correct_answer: "",
    points: 1,
  });
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
const [videoSearchResults, setVideoSearchResults] = useState([]);
const [selectedVideo, setSelectedVideo] = useState(null); // For the currently selected video
const [newPair, setNewPair] = useState({}); // For temporarily storing a new pair (word and video)


const loadTasks = useCallback(async () => {
  try {
    const { data } = await api.get("/admin/tasks", {
      params: { lesson_id: Number(lessonId) },
    });
    setTasks(data);
  } catch (error) {
    console.error("Error fetching tasks:", error.response?.data || error.message);
  }
}, [lessonId]);
const saveTask = async () => {
  const sanitizedPoints =
    taskData.task_type === "sign_presentation" ? 0 : Math.max(0, Number(taskData.points || 0));


  // If some task types store a string, wrap it so the API (expects Dict) doesn't drop it
  const correctedAnswer =
    typeof taskData.correct_answer === "string"
      ? { text: taskData.correct_answer }
      : (taskData.correct_answer || {});

  const payload = {
    task_type: taskData.task_type,
    content: taskData.content || {},                    // dict
    correct_answer: taskData.task_type === "sign_presentation" ? {} : correctedAnswer,
    points: sanitizedPoints,
    lesson_id: Number(lessonId),                        // ensure number
    version: Number(taskData.version || 1),
    video_ids: taskData.content?.video_id ? [taskData.content.video_id] : [],
  };

  try {
    if (taskData.task_id) {
      await api.put(`/admin/tasks/${taskData.task_id}`, payload);
    } else {
      await api.post(`/admin/tasks`, payload);
    }
    await loadTasks();   // reuse your helper
    closeModal();
  } catch (error) {
    console.error("Error saving task:", error.response?.data || error.message);
  }
};


  


  const searchVideos = async () => {
    if (!videoSearchQuery.trim()) return;
  
    try {
      const res = await api.get("/admin/videos", { params: { query: videoSearchQuery } });
      setVideoSearchResults(res.data);
    } catch (error) {
      console.error("Error searching videos:", error.response?.data || error.message);
    }
  };

  const cancelEdit = () => {
  setIsModalOpen(false); // Close the modal
  setTaskData({
    task_type: "",
    content: {},
    correct_answer: "",
    points: 1,
  }); // Reset the task data
};


  useEffect(() => {
  loadTasks();
}, [loadTasks]);



  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTaskData({
      task_type: "",
      content: {},
      correct_answer: "",
      points: 1,
    });
  };

  const handleEdit = (task) => {
    setTaskData({
      task_type: task.task_type,
      content: task.content,
      correct_answer: task.correct_answer,
      points: task.points,
      task_id: task.task_id, // Ensure task_id is set
      version: task.version || 1, // Add version to avoid missing it
    });
    setIsModalOpen(true); // Open the modal for editing
  };

  // fetch tasks for this lesson (re-usable)


// delete a task, then refresh list
const deleteTask = useCallback(async (taskId) => {
  try {
    await api.delete(`/admin/tasks/${taskId}`);
    await loadTasks();
  } catch (error) {
    console.error("Error deleting task:", error.response?.data || error.message);
  }
}, [loadTasks]);

  
  const handleTaskTypeChange = (type) => {
    setTaskData((prev) => ({
      ...prev,
      task_type: type,
      content: {},
      correct_answer: type === "video_to_sign" ? "" : {},
      points: type === "sign_presentation" ? 0 : prev.points, // Set points only for applicable tasks
    }));
  };

 
  const renderTaskInputs = () => {
    switch (taskData.task_type) {
        case "video_recognition":
      return (
        <>
          {/* Video Selection Section */}
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "10px" }}>
            Select a Video:
          </Typography>
          <Box sx={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <TextField
              fullWidth
              label="Search for a sign"
              value={videoSearchQuery}
              onChange={(e) => setVideoSearchQuery(e.target.value)}
              sx={{
                backgroundColor: "#f3f4f6",
                borderRadius: "5px",
              }}
            />
            <Button
              onClick={searchVideos}
              variant="contained"
              sx={{
                backgroundColor: "#5b21b6",
                color: "#fff",
                "&:hover": { backgroundColor: "#4a148c" },
              }}
            >
              Search
            </Button>
          </Box>
          {/* Video Results */}
          <Box
            sx={{
              maxHeight: "200px",
              overflowY: "auto",
              marginBottom: "20px",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
            }}
          >
            {videoSearchResults.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  color: "#6b7280",
                  marginTop: "10px",
                  fontStyle: "italic",
                }}
              >
                No videos found. Please refine your search.
              </Typography>
            ) : (
              videoSearchResults.map((video) => {
                const correctedVideoUrl = video.video_url.replace(
                  "singlearnavatarstorage",
                  "asl-video-dataset"
                );

                return (
                    <Box
                    key={video.video_id}
                    onClick={() =>
                      setTaskData((prev) => ({
                        ...prev,
                        content: { ...prev.content, video_id: video.video_id },
                      }))
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px",
                      marginBottom: "10px",
                      border: `2px solid ${
                        taskData.content.video_id === video.video_id ? "#5b21b6" : "#ccc"
                      }`,
                      borderRadius: "8px",
                      backgroundColor:
                        taskData.content.video_id === video.video_id ? "#f3e8ff" : "#fff",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: "#5b21b6",
                        backgroundColor: "#f9f9f9",
                      },
                      position: "relative", // Ensure the enlarged video is positioned correctly
                      overflow: "visible", // Allow the enlarged video to go beyond the container
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        color: "#4a148c",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        marginRight: "10px",
                      }}
                    >
                      {video.gloss || "No title"}
                    </Typography>
                    {correctedVideoUrl ? (
                      <Box
                        sx={{
                          position: "relative",
                          overflow: "visible", // Allow video to go beyond container on hover
                          zIndex: 0, // Ensure normal stacking unless hovered
                          "&:hover video": {
                            transform: "scale(1.5)", // Enlarge the video on hover
                            zIndex: 10, // Bring enlarged video to the top
                            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)", // Add shadow for visibility
                          },
                        }}
                      >
                        <video
                          src={correctedVideoUrl} // Use the corrected URL
                          controls
                          style={{
                            width: "150px",
                            height: "auto",
                            borderRadius: "5px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                            transition: "transform 0.3s ease, z-index 0s 0.3s", // Smooth scaling and delay z-index reset
                          }}
                          onError={(e) => {
                            e.target.style.display = "none"; // Hide the video on error
                            console.error(
                              `Error loading video (ID: ${video.video_id}, URL: ${correctedVideoUrl})`
                            );
                          }}
                        />
                      </Box>
                    ) : (
                      <Typography color="error" sx={{ fontSize: "12px" }}>
                        Video unavailable
                      </Typography>
                    )}
                  </Box>
                  
                  
      );
    })
  )}
</Box>



          
                {/* Options Section */}
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "10px" }}>
                  Options:
                </Typography>
                <Box sx={{ marginBottom: "15px" }}>
  {(taskData.content.options || []).map((option, index) => (
    <Box
      key={index}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "10px",
      }}
    >
      <TextField
        fullWidth
        label={`Option ${index + 1}`}
        value={option || ""}
        onChange={(e) =>
          setTaskData((prev) => {
            const updatedOptions = [...(prev.content.options || [])];
            updatedOptions[index] = e.target.value;
            return { ...prev, content: { ...prev.content, options: updatedOptions } 
        };
          })
        }
        sx={{
          flexGrow: 1,
          backgroundColor: "#f3f4f6",
          borderRadius: "5px",
        }}
      />
      <Button
        variant={taskData.correct_answer === index ? "contained" : "outlined"}
        color="success"
        onClick={() =>
          setTaskData((prev) => ({
            ...prev,
            correct_answer: { option: taskData.content.options[index] },
          }))
        }
        sx={{
          padding: "8px 16px",
          minWidth: "100px",
          fontSize: "0.9rem",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        {taskData.correct_answer.option === taskData.content.options[index]
          ? "Correct"
          : "Set Correct"}
      </Button>
      <Button
        variant="outlined"
        color="error"
        onClick={() =>
          setTaskData((prev) => ({
            ...prev,
            content: {
              ...prev.content,
              options: prev.content.options.filter((_, i) => i !== index),
            },
            correct_answer: prev.correct_answer.option === option ? {} : prev.correct_answer,
          }))
        }
        sx={{
          padding: "8px 16px",
          minWidth: "100px",
          fontSize: "0.9rem",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        Remove
      </Button>
    </Box>
  ))}
  <Button
    variant="outlined"
    onClick={() =>
      setTaskData((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          options: [...(prev.content.options || []), ""],
        },
      }))
    }
    sx={{
      marginTop: "10px",
      fontWeight: "bold",
      color: "#5b21b6",
      borderColor: "#5b21b6",
      "&:hover": {
        backgroundColor: "#f3e8ff",
        borderColor: "#4a148c",
      },
    }}
  >
    Add Option
  </Button>
</Box>

              </>
            );
          
          
          

            case "video_to_sign":
                return (
                  <>
                    {/* Video Selection Section */}
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "10px" }}>
                      Select a Video:
                    </Typography>
                    <Box sx={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                      <TextField
                        fullWidth
                        label="Search for a video"
                        value={videoSearchQuery}
                        onChange={(e) => setVideoSearchQuery(e.target.value)}
                        sx={{
                          backgroundColor: "#f3f4f6",
                          borderRadius: "5px",
                        }}
                      />
                      <Button
                        onClick={searchVideos}
                        variant="contained"
                        sx={{
                          backgroundColor: "#5b21b6",
                          color: "#fff",
                          "&:hover": { backgroundColor: "#4a148c" },
                        }}
                      >
                        Search
                      </Button>
                    </Box>
              
                    {/* Video Results */}
                    <Box
                      sx={{
                        maxHeight: "200px",
                        overflowY: "auto",
                        marginBottom: "20px",
                        padding: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      {videoSearchResults.length === 0 ? (
                        <Typography
                          variant="body2"
                          sx={{
                            textAlign: "center",
                            color: "#6b7280",
                            marginTop: "10px",
                            fontStyle: "italic",
                          }}
                        >
                          No videos found. Please refine your search.
                        </Typography>
                      ) : (
                        videoSearchResults.map((video) => {
                          const correctedVideoUrl = video.video_url.replace(
                            "singlearnavatarstorage",
                            "asl-video-dataset"
                          );
              
                          return (
                            <Box
                              key={video.video_id}
                              onClick={() =>
                                setTaskData((prev) => ({
                                  ...prev,
                                  content: { video_id: video.video_id },
                                  correct_answer: video.gloss, // Automatically set the correct answer to the video's gloss
                                }))
                              }
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px",
                                marginBottom: "10px",
                                border: `2px solid ${
                                  taskData.content.video_id === video.video_id ? "#5b21b6" : "#ccc"
                                }`,
                                borderRadius: "8px",
                                backgroundColor:
                                  taskData.content.video_id === video.video_id ? "#f3e8ff" : "#fff",
                                cursor: "pointer",
                                "&:hover": {
                                  borderColor: "#5b21b6",
                                  backgroundColor: "#f9f9f9",
                                },
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: "bold",
                                  color: "#4a148c",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                  marginRight: "10px",
                                }}
                              >
                                {video.gloss || "No title"}
                              </Typography>
                              {correctedVideoUrl ? (
                                <video
                                  src={correctedVideoUrl}
                                  controls
                                  style={{
                                    width: "150px",
                                    height: "auto",
                                    borderRadius: "5px",
                                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                  }}
                                />
                              ) : (
                                <Typography color="error" sx={{ fontSize: "12px" }}>
                                  Video unavailable
                                </Typography>
                              )}
                            </Box>
                          );
                        })
                      )}
                    </Box>
                  </>
                );
              
        case "matching":
            return (
              <>
                {/* Search for Video */}
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "10px" }}>
                  Search for a Video:
                </Typography>
                <Box sx={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <TextField
                    fullWidth
                    label="Search for a sign"
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    sx={{
                      backgroundColor: "#f3f4f6",
                      borderRadius: "5px",
                    }}
                  />
                  <Button
                    onClick={() => {
                      searchVideos();
                      setNewPair((prev) => ({ ...prev, word: videoSearchQuery })); // Automatically set the word
                    }}
                    variant="contained"
                    sx={{
                      backgroundColor: "#5b21b6",
                      color: "#fff",
                      "&:hover": { backgroundColor: "#4a148c" },
                    }}
                  >
                    Search
                  </Button>
                </Box>
          
                {/* Video Results */}
                <Box
                  sx={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginBottom: "20px",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  {videoSearchResults.length === 0 ? (
                    <Typography
                      variant="body2"
                      sx={{
                        textAlign: "center",
                        color: "#6b7280",
                        marginTop: "10px",
                        fontStyle: "italic",
                      }}
                    >
                      No videos found. Please refine your search.
                    </Typography>
                  ) : (
                    videoSearchResults.map((video) => {
                      const correctedVideoUrl = video.video_url.replace(
                        "singlearnavatarstorage",
                        "asl-video-dataset"
                      );
          
                      return (
                        <Box
                          key={video.video_id}
                          onClick={() =>
                            setNewPair((prev) => ({
                              ...prev,
                              video: { id: video.video_id, gloss: video.gloss },
                            }))
                          }
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px",
                            marginBottom: "10px",
                            border: `2px solid ${
                              newPair.video?.id === video.video_id ? "#5b21b6" : "#ccc"
                            }`,
                            borderRadius: "8px",
                            backgroundColor: newPair.video?.id === video.video_id ? "#f3e8ff" : "#fff",
                            cursor: "pointer",
                            "&:hover": {
                              borderColor: "#5b21b6",
                              backgroundColor: "#f9f9f9",
                            },
                            position: "relative", // Ensure the enlarged video is positioned correctly
                            overflow: "visible", // Allow the enlarged video to go beyond the container
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color: "#4a148c",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              marginRight: "10px",
                            }}
                          >
                            {video.gloss || "No title"}
                          </Typography>
                          <Box
                            sx={{
                              position: "relative",
                              overflow: "visible", // Allow video to go beyond container on hover
                              zIndex: 0, // Ensure normal stacking unless hovered
                              "&:hover video": {
                                transform: "scale(1.5)", // Enlarge the video on hover
                                zIndex: 10, // Bring enlarged video to the top
                                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)", // Add shadow for visibility
                              },
                            }}
                          >
                            <video
                              src={correctedVideoUrl}
                              controls
                              style={{
                                width: "150px",
                                height: "auto",
                                borderRadius: "5px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                transition: "transform 0.3s ease, z-index 0s 0.3s", // Smooth scaling and delay z-index reset
                              }}
                              onError={(e) => {
                                e.target.style.display = "none"; // Hide the video on error
                                console.error(
                                  `Error loading video (ID: ${video.video_id}, URL: ${correctedVideoUrl})`
                                );
                              }}
                            />
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
          
                {/* Add Pair */}
                <Button
                  onClick={() => {
                    if (newPair.word && newPair.video) {
                      setTaskData((prev) => ({
                        ...prev,
                        content: {
                          pairs: [...(prev.content.pairs || []), newPair],
                        },
                      }));
                      setNewPair({}); // Reset the input fields
                    }
                  }}
                  variant="contained"
                  sx={{
                    backgroundColor: "#5b21b6",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#4a148c" },
                  }}
                  disabled={!newPair.word || !newPair.video} // Disable the button if word or video is not selected
                >
                  Add Pair
                </Button>
          
                {/* List of Added Pairs */}
                <Box sx={{ marginTop: "20px" }}>
                  {taskData.content.pairs?.map((pair, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px",
                        marginBottom: "10px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      <Typography>
                        {index + 1}. {pair.word} : {pair.video.gloss}
                      </Typography>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() =>
                          setTaskData((prev) => ({
                            ...prev,
                            content: {
                              pairs: prev.content.pairs.filter((_, i) => i !== index),
                            },
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Box>
              </>
            );
          

          
      case "gesture_replication":
        return (
          <>
            <TextField
              fullWidth
              label="Gesture Description"
              value={taskData.content.description || ""}
              onChange={(e) =>
                setTaskData((prev) => ({ ...prev, content: { description: e.target.value },  points: Math.max(0, Number(e.target.value)), }))
              }
              sx={{ marginBottom: "15px" }}
            />
            <TextField
              fullWidth
              label="Video URL"
              value={taskData.content.video_url || ""}
              onChange={(e) =>
                setTaskData((prev) => ({ ...prev, content: { video_url: e.target.value } }))
              }
              sx={{ marginBottom: "15px" }}
            />
          </>
        );

        case "sign_speed_challenge":
            return (
              <>
                {/* Video Selection Section */}
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "10px" }}>
                  Select a Video:
                </Typography>
                <Box sx={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <TextField
                    fullWidth
                    label="Search for a video"
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    sx={{
                      backgroundColor: "#f3f4f6",
                      borderRadius: "5px",
                    }}
                  />
                  <Button
                    onClick={searchVideos}
                    variant="contained"
                    sx={{
                      backgroundColor: "#5b21b6",
                      color: "#fff",
                      "&:hover": { backgroundColor: "#4a148c" },
                    }}
                  >
                    Search
                  </Button>
                </Box>
          
                {/* Video Results */}
                <Box
                  sx={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginBottom: "20px",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  {videoSearchResults.length === 0 ? (
                    <Typography
                      variant="body2"
                      sx={{
                        textAlign: "center",
                        color: "#6b7280",
                        marginTop: "10px",
                        fontStyle: "italic",
                      }}
                    >
                      No videos found. Please refine your search.
                    </Typography>
                  ) : (
                    videoSearchResults.map((video) => {
                      const correctedVideoUrl = video.video_url.replace(
                        "singlearnavatarstorage",
                        "asl-video-dataset"
                      );
          
                      return (
                        <Box
                          key={video.video_id}
                          onClick={() =>
                            setTaskData((prev) => ({
                              ...prev,
                              content: { ...prev.content, video_id: video.video_id },
                            }))
                          }
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px",
                            marginBottom: "10px",
                            border: `2px solid ${
                              taskData.content.video_id === video.video_id ? "#5b21b6" : "#ccc"
                            }`,
                            borderRadius: "8px",
                            backgroundColor:
                              taskData.content.video_id === video.video_id ? "#f3e8ff" : "#fff",
                            cursor: "pointer",
                            "&:hover": {
                              borderColor: "#5b21b6",
                              backgroundColor: "#f9f9f9",
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color: "#4a148c",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              marginRight: "10px",
                            }}
                          >
                            {video.gloss || "No title"}
                          </Typography>
                          {correctedVideoUrl ? (
                            <video
                              src={correctedVideoUrl}
                              controls
                              style={{
                                width: "150px",
                                height: "auto",
                                borderRadius: "5px",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                              }}
                            />
                          ) : (
                            <Typography color="error" sx={{ fontSize: "12px" }}>
                              Video unavailable
                            </Typography>
                          )}
                        </Box>
                      );
                    })
                  )}
                </Box>
          
                {/* Options Section */}
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "10px" }}>
                  Options:
                </Typography>
                <Box sx={{ marginBottom: "15px" }}>
                  {(taskData.content.options || []).map((option, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      <TextField
                        fullWidth
                        label={`Option ${index + 1}`}
                        value={option || ""}
                        onChange={(e) =>
                          setTaskData((prev) => {
                            const updatedOptions = [...(prev.content.options || [])];
                            updatedOptions[index] = e.target.value;
                            return { ...prev, content: { ...prev.content, options: updatedOptions },  points: Math.max(0, Number(e.target.value)),};
                          })
                        }
                        sx={{
                          flexGrow: 1,
                          backgroundColor: "#f3f4f6",
                          borderRadius: "5px",
                        }}
                      />
                      <Button
                        variant={
                          taskData.correct_answer?.option === option ? "contained" : "outlined"
                        }
                        color="success"
                        onClick={() =>
                          setTaskData((prev) => ({
                            ...prev,
                        
                            correct_answer: { option },
                            

                          }))
                        }
                        sx={{
                          padding: "8px 16px",
                          minWidth: "100px",
                          fontSize: "0.9rem",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        {taskData.correct_answer?.option === option
                          ? "Correct"
                          : "Set Correct"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() =>
                          setTaskData((prev) => ({
                            ...prev,
                            content: {
                              ...prev.content,
                              options: prev.content.options.filter((_, i) => i !== index),
                            },
                            correct_answer:
                              prev.correct_answer?.option === option
                                ? null
                                : prev.correct_answer,
                          }))
                        }
                        sx={{
                          padding: "8px 16px",
                          minWidth: "100px",
                          fontSize: "0.9rem",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setTaskData((prev) => ({
                        ...prev,
                        content: {
                          ...prev.content,
                          options: [...(prev.content.options || []), ""],
                        },
                      }))
                    }
                    sx={{
                      marginTop: "10px",
                      fontWeight: "bold",
                      color: "#5b21b6",
                      borderColor: "#5b21b6",
                      "&:hover": {
                        backgroundColor: "#f3e8ff",
                        borderColor: "#4a148c",
                      },
                    }}
                  >
                    Add Option
                  </Button>
                </Box>
          
                {/* Time Limit */}
                <TextField
                  fullWidth
                  label="Time Limit (seconds)"
                  type="number"
                  value={taskData.content.time_limit || ""}
                  onChange={(e) =>
                    setTaskData((prev) => ({
                      ...prev,
                      content: { ...prev.content, time_limit: Math.max(0, e.target.value),  points: Math.max(0, Number(e.target.value)),


                       },
                    }))
                  }
                  sx={{ marginBottom: "15px" }}
                />
              </>
            );
          

        case "sign_presentation": // New task type logic
        return (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", marginBottom: "10px" }}>
              Select a Video to Present:
            </Typography>
            <Box sx={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <TextField
                fullWidth
                label="Search for a sign"
                value={videoSearchQuery}
                onChange={(e) => setVideoSearchQuery(e.target.value)}
                sx={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: "5px",
                }}
              />
              <Button
                onClick={searchVideos}
                variant="contained"
                sx={{
                  backgroundColor: "#5b21b6",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#4a148c" },
                }}
              >
                Search
              </Button>
            </Box>
            <Box
              sx={{
                maxHeight: "200px",
                overflowY: "auto",
                marginBottom: "20px",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            >
              {videoSearchResults.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "center",
                    color: "#6b7280",
                    marginTop: "10px",
                    fontStyle: "italic",
                  }}
                >
                  No videos found. Please refine your search.
                </Typography>
              ) : (
                videoSearchResults.map((video) => {
                  const correctedVideoUrl = video.video_url.replace(
                    "singlearnavatarstorage",
                    "asl-video-dataset"
                  );

                  return (
                    <Box
                      key={video.video_id}
                      onClick={() =>
                        setTaskData((prev) => ({
                          ...prev,
                          content: { ...prev.content, video_id: video.video_id },
                        }))
                      }
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px",
                        marginBottom: "10px",
                        border: `2px solid ${
                          taskData.content.video_id === video.video_id ? "#5b21b6" : "#ccc"
                        }`,
                        borderRadius: "8px",
                        backgroundColor:
                          taskData.content.video_id === video.video_id ? "#f3e8ff" : "#fff",
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "#5b21b6",
                          backgroundColor: "#f9f9f9",
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: "bold",
                          color: "#4a148c",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          marginRight: "10px",
                        }}
                      >
                        {video.gloss || "No title"}
                      </Typography>
                      {correctedVideoUrl ? (
                        <video
                          src={correctedVideoUrl}
                          controls
                          style={{
                            width: "150px",
                            height: "auto",
                            borderRadius: "5px",
                            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                      ) : (
                        <Typography color="error" sx={{ fontSize: "12px" }}>
                          Video unavailable
                        </Typography>
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          </>
        );

    //   default:
    //     return <Typography>Please select a task type.</Typography>;
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9f9f9" }}>
      {/* Sidebar */}
      <Sidebar />

 {/* Main Content */}
 <Box sx={{ flexGrow: 1, padding: "20px", overflow: "hidden" }}>
    <Typography
      variant="h4"
      sx={{
        marginBottom: "20px",
        fontWeight: "bold",
        color: "#4a148c",
      }}
    >
      Tasks for Lesson {lessonId}
    </Typography>

    {/* Scrollable Task List */}
    <Box
      sx={{
        maxHeight: "calc(100vh - 200px)", // Adjust height for the available space
        overflowY: "auto",
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#f3e8ff",
      }}
    >
      {tasks.map((task) => (
        <Card
          key={task.task_id}
          sx={{
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(91, 33, 182, 0.2)",
            backgroundColor: "#f9f9f9",
            position: "relative",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Task Type: {task.task_type.replace(/_/g, " ")}
          </Typography>

          {task.task_type !== "sign_presentation" && (
    <Typography variant="body2" sx={{ fontWeight: "bold", color: "#4a148c" }}>
      Points: {task.points}
    </Typography>
  )}

          {/* Display task content differently for matching tasks */}
          {task.task_type === "matching" && task.content?.pairs ? (
            task.content.pairs.length > 0 ? (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  Matching Pairs:
                </Typography>
                {task.content.pairs.map((pair, index) => (
                  <Typography key={index}>
                    {index + 1}. {pair.word || "No word"} - {pair.video?.gloss || "No gloss"}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{ fontStyle: "italic", color: "gray" }}
              >
                No matching pairs available.
              </Typography>
            )
          ) : (
            <Typography variant="body2">
              Content: {JSON.stringify(task.content)}
            </Typography>
          )}

          <Box
            sx={{
              position: "absolute",
              top: "10px",
              right: "10px",
              display: "flex",
              gap: "10px",
            }}
          >
            <Edit
              onClick={() => handleEdit(task)}
              sx={{ cursor: "pointer", color: "#4a148c" }}
            />
            <Delete
              onClick={() => deleteTask(task.task_id)}
              sx={{ cursor: "pointer", color: "#d32f2f" }}
            />
          </Box>
        </Card>
      ))}
    </Box>

    <Button
      variant="contained"
      onClick={openModal}
      sx={{
        marginTop: "20px",
        backgroundColor: "#5b21b6",
        color: "#fff",
        "&:hover": { backgroundColor: "#4a148c" },
      }}
    >
      Add New Task
    </Button>
  </Box>

  <Modal open={isModalOpen} onClose={closeModal}>
  <Box
    sx={{
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "500px",
      maxHeight: "80vh",
      overflowY: "auto",
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    }}
  >
    <Typography variant="h6" sx={{ marginBottom: "20px", textAlign: "center" }}>
      {taskData.task_id ? "Edit Task" : "Add New Task"}
    </Typography>

    {/* Task Type Selector */}
    <Select
      fullWidth
      value={taskData.task_type}
      onChange={(e) => handleTaskTypeChange(e.target.value)}
      displayEmpty
      sx={{ marginBottom: "15px" }}
    >
      <MenuItem value="" disabled>
        Select Task Type
      </MenuItem>
      {taskTypeOptions.map((option) => (
        <MenuItem key={option} value={option}>
          {option.replace(/_/g, " ")}
        </MenuItem>
      ))}
    </Select>

    {/* Dynamic Inputs Based on Task Type */}
    {renderTaskInputs()}

    {/* ✅ Add Points Field (Only if Task Type is NOT Sign Presentation) */}
    {taskData.task_type !== "sign_presentation" && (
      <TextField
      fullWidth
      label="Points"
      type="number"
      value={taskData.points}
      onChange={(e) => {
        let value = e.target.value.replace(/^0+/, ""); // Remove leading zeros
        value = value === "" ? "0" : value; // Ensure it doesn’t become empty
        setTaskData((prev) => ({
          ...prev,
          points: parseInt(value, 10) || 0, // Convert to number safely
        }));
      }}
      sx={{ marginBottom: "15px" }}
    />
    
    )}

    {/* Save and Cancel Buttons */}
    <Box sx={{ display: "flex", gap: "10px" }}>
      <Button
        onClick={saveTask}
        sx={{
          flex: 1,
          backgroundColor: "#5b21b6",
          color: "#fff",
          "&:hover": { backgroundColor: "#4a148c" },
        }}
      >
        Save Task
      </Button>
      <Button
        onClick={closeModal}
        sx={{
          flex: 1,
          backgroundColor: "#fff",
          color: "#5b21b6",
          border: "2px solid #5b21b6",
          "&:hover": { backgroundColor: "#f3e8ff" },
        }}
      >
        Cancel
      </Button>
    </Box>
  </Box>
</Modal>

</Box>
    
  );
};

export default TaskList;
