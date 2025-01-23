import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Box, Card, Typography } from "@mui/material";

const TaskList = () => {
  const { lessonId } = useParams(); // Get the lesson ID from the URL
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/admin/tasks?lesson_id=${lessonId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
          }
        );
        setTasks(res.data);
      } catch (error) {
        console.error("Error fetching tasks:", error.response?.data || error.message);
      }
    };

    fetchTasks();
  }, [lessonId]);

  return (
    <Box>
      <Typography variant="h4" sx={{ marginBottom: "20px" }}>
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
            Task Type: {task.task_type}
          </Typography>
          <Typography variant="body2">
            Content: {JSON.stringify(task.content)}
          </Typography>
        </Card>
      ))}
    </Box>
  );
};

export default TaskList;
