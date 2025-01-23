import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, TextField, Button, Typography } from "@mui/material";

const TaskCreation = () => {
  const { lessonId } = useParams(); // Get the lesson ID from the URL
  const navigate = useNavigate();
  const [taskData, setTaskData] = useState({
    task_type: "",
    content: {},
    correct_answer: {},
    points: 1,
    version: 1,
  });

  const handleSubmit = async () => {
    try {
      await axios.post(
        `http://localhost:8000/admin/tasks`,
        { ...taskData, lesson_id: lessonId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }
      );
      navigate(`/admin/lessons/${lessonId}/tasks`);
    } catch (error) {
      console.error("Error creating task:", error.response?.data || error.message);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ marginBottom: "20px" }}>
        Create Task for Lesson {lessonId}
      </Typography>
      <TextField
        fullWidth
        label="Task Type"
        value={taskData.task_type}
        onChange={(e) => setTaskData({ ...taskData, task_type: e.target.value })}
        sx={{ marginBottom: "15px" }}
      />
      <TextField
        fullWidth
        label="Content (JSON)"
        value={JSON.stringify(taskData.content)}
        onChange={(e) =>
          setTaskData({ ...taskData, content: JSON.parse(e.target.value) })
        }
        sx={{ marginBottom: "15px" }}
      />
      <TextField
        fullWidth
        label="Correct Answer (JSON)"
        value={JSON.stringify(taskData.correct_answer)}
        onChange={(e) =>
          setTaskData({ ...taskData, correct_answer: JSON.parse(e.target.value) })
        }
        sx={{ marginBottom: "15px" }}
      />
      <Button onClick={handleSubmit} sx={{ backgroundColor: "#5b21b6", color: "#fff" }}>
        Save Task
      </Button>
    </Box>
  );
};

export default TaskCreation;
