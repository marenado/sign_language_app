import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
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

const BASE_URL = "http://localhost:8000";

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
  ]);
  const [taskData, setTaskData] = useState({
    task_type: "",
    content: {},
    correct_answer: "",
    points: 1,
  });
  const [videoSearchQuery, setVideoSearchQuery] = useState("");
const [videoSearchResults, setVideoSearchResults] = useState([]);


  const searchVideos = async () => {
    if (!videoSearchQuery.trim()) return;
  
    try {
      const res = await axios.get(`${BASE_URL}/admin/videos?query=${videoSearchQuery}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setVideoSearchResults(res.data);
    } catch (error) {
      console.error("Error searching videos:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/admin/tasks?lesson_id=${lessonId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        });
        setTasks(res.data);
      } catch (error) {
        console.error("Error fetching tasks:", error.response?.data || error.message);
      }
    };

    fetchTasks();
  }, [lessonId]);


  useEffect(() => {
  console.log("Video search results:", videoSearchResults);
}, [videoSearchResults]);


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

  const handleTaskTypeChange = (type) => {
    setTaskData((prev) => ({ ...prev, task_type: type, content: {}, correct_answer: "" }));
  };

  const createTask = async () => {
    const formattedContent =
      taskData.task_type === "matching"
        ? { pairs: taskData.content }
        : taskData.content;

    try {
      await axios.post(
        `${BASE_URL}/admin/tasks`,
        { ...taskData, content: formattedContent, lesson_id: lessonId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }
      );
      const res = await axios.get(`${BASE_URL}/admin/tasks?lesson_id=${lessonId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setTasks(res.data); // Refresh the tasks list
      closeModal();
    } catch (error) {
      console.error("Error creating task:", error.response?.data || error.message);
    }
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
      // Fix the URL if the bucket name is incorrect
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
              src={correctedVideoUrl} // Use the corrected URL
              controls
              style={{
                width: "150px",
                height: "auto",
                borderRadius: "5px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              }}
              onError={(e) => {
                e.target.style.display = "none"; // Hide the video
                console.error(
                  `Error loading video (ID: ${video.video_id}, URL: ${correctedVideoUrl})`
                );
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
                            return { ...prev, content: { ...prev.content, options: updatedOptions } };
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
                            correct_answer: index,
                          }))
                        }
                        sx={{
                          padding: "8px 16px",
                          minWidth: "100px",
                          fontSize: "0.9rem",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        {taskData.correct_answer === index ? "Correct" : "Set Correct"}
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
                            correct_answer: prev.correct_answer === index ? null : prev.correct_answer,
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
            <TextField
              fullWidth
              label="Video URL"
              value={taskData.content.video_url || ""}
              onChange={(e) => setTaskData((prev) => ({ ...prev, content: { video_url: e.target.value } }))}
              sx={{ marginBottom: "15px" }}
            />
            <TextField
              fullWidth
              label="Expected Sign"
              value={taskData.correct_answer}
              onChange={(e) => setTaskData((prev) => ({ ...prev, correct_answer: e.target.value }))}
              sx={{ marginBottom: "15px" }}
            />
          </>
        );

      case "matching":
        return (
          <>
            <Typography variant="body2" sx={{ marginBottom: "10px" }}>
              Add matching pairs (e.g., "word: sign"):
            </Typography>
            <TextField
              fullWidth
              label="Add Pair"
              value={taskData.content.pair || ""}
              onChange={(e) =>
                setTaskData((prev) => ({
                  ...prev,
                  content: { pairs: [...(prev.content.pairs || []), e.target.value] },
                }))
              }
              sx={{ marginBottom: "15px" }}
            />
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
                setTaskData((prev) => ({ ...prev, content: { description: e.target.value } }))
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
            <TextField
              fullWidth
              label="Video URL"
              value={taskData.content.video_url || ""}
              onChange={(e) =>
                setTaskData((prev) => ({ ...prev, content: { video_url: e.target.value } }))
              }
              sx={{ marginBottom: "15px" }}
            />
            <TextField
              fullWidth
              label="Correct Answer"
              value={taskData.correct_answer}
              onChange={(e) => setTaskData((prev) => ({ ...prev, correct_answer: e.target.value }))}
              sx={{ marginBottom: "15px" }}
            />
          </>
        );

    //   default:
    //     return <Typography>Please select a task type.</Typography>;
    }
  };

  return (
    <Box sx={{ padding: "20px", background: "#f9f9f9", minHeight: "100vh" }}>
      <Typography variant="h4" sx={{ marginBottom: "20px", fontWeight: "bold", color: "#4a148c" }}>
        Tasks for Lesson {lessonId}
      </Typography>
      {tasks.map((task) => (
        <Card
          key={task.task_id}
          sx={{
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "10px",
            boxShadow: "0 2px 4px rgba(91, 33, 182, 0.2)",
            backgroundColor: "#f3e8ff",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Task Type: {task.task_type.replace(/_/g, " ")}
          </Typography>
          <Typography variant="body2">
            Content: {JSON.stringify(task.content)}
          </Typography>
        </Card>
      ))}
      <Button
        variant="contained"
        onClick={openModal}
        sx={{
          backgroundColor: "#5b21b6",
          color: "#fff",
          "&:hover": { backgroundColor: "#4a148c" },
        }}
      >
        Add New Task
      </Button>

      <Modal open={isModalOpen} onClose={closeModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: "20px", textAlign: "center" }}>
            Add New Task
          </Typography>
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

          {renderTaskInputs()}

          <TextField
            fullWidth
            label="Points"
            type="number"
            value={taskData.points}
            onChange={(e) => setTaskData((prev) => ({ ...prev, points: Number(e.target.value) }))}
            sx={{ marginBottom: "15px" }}
          />
          <Button
            fullWidth
            onClick={createTask}
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
  );
};

export default TaskList;
