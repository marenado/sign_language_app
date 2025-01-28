import React, { useEffect, useState } from "react";
import axios from "axios";
import { EmojiEvents, TrendingUp } from "@mui/icons-material"; // Import icons
import Sidebar from "./Sidebar"; // Import Sidebar
import { Line } from "react-chartjs-2";
import api from "../services/api"; 
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Avatar, Box, Button, Card, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom"; // Import navigation hook

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    username: "User",
    email: "user@example.com",
    avatar: "https://via.placeholder.com/100",
    points: 0,
    lessons_completed: 0,
    role: "",
    total_time_spent: 0,
  });;
  const [loading, setLoading] = useState(true);
  const [topUsers, setTopUsers] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Initialize navigation


  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardResponse = await api.get("/users/dashboard");
        const topUsersResponse = await api.get("/users/top-users");

        setDashboardData(dashboardResponse.data);
        setTopUsers(topUsersResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.response?.status === 401) {
          setError("Access token expired. Please log in again.");
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/";
        } else {
          setError(err.response?.data?.detail || "Failed to load dashboard data.");
        }
      }
    };

    fetchData();
  }, []);



  const chartData = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Points Gained",
        data: [...Array(11).fill(0), dashboardData.points || 0],
        borderColor: "#c084fc",
        backgroundColor: "rgba(192, 132, 252, 0.2)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 14,
          },
          color: "#333",
        },
      },
      title: {
        display: true,
        // text: "Monthly Trends",
        font: {
          size: 18,
        },
        color: "#333",
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: "#e5e7eb",
        },
        ticks: {
          color: "#333",
          font: {
            size: 14,
          },
        },
      },
      y: {
        grid: {
          display: true,
          color: "#e5e7eb",
        },
        ticks: {
          color: "#333",
          font: {
            size: 14,
          },
        },
      },
    },
  };
  
  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        background: "linear-gradient(to bottom, white, #E6DFFF)",
        overflow: "hidden",
      }}
    >
      <Sidebar /> 
      <Box
        sx={{
          flex: 1,
          padding: "40px",
          overflowY: "scroll",
        }}
      >
        {/* Profile Card */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginTop: "40px",
            marginBottom: "40px",
          }}
        >
          <Card
            sx={{
              position: "relative",
              textAlign: "center",
              backgroundColor: "#f4f4ff",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              maxWidth: "400px",
              width: "100%",
              margin: "0 auto",
              paddingTop: "60px",
              overflow: "visible",
            }}
          >
            <Avatar
              sx={{
                width: "100px",
                height: "100px",
                position: "absolute",
                top: "-50px",
                left: "50%",
                transform: "translateX(-50%)",
                border: "5px solid #f4f4ff",
                backgroundColor: "#fff",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              }}
              src={dashboardData.avatar || "https://via.placeholder.com/100"}
              alt="User Avatar"
            />
            <Box sx={{ marginTop: "20px" }}>
              <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
                {dashboardData.username || "User"}
              </Typography>
              <Typography variant="body1" sx={{ color: "#666", marginBottom: "20px" }}>
                {dashboardData.email || "user@example.com"}
              </Typography>

              {/* Divider and Stats */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #e0e0e0",
                  paddingTop: "20px",
                  marginTop: "20px",
                }}
              >
                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold", color: "#333" }}>
                    Lessons
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: "#5b21b6" }}>
                    {dashboardData.lessons_completed || 0}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: "1px",
                    height: "40px",
                    backgroundColor: "#e0e0e0",
                  }}
                ></Box>
                <Box sx={{ flex: 1, textAlign: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold", color: "#333" }}>
                    Points
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: "#5b21b6" }}>
                    {dashboardData.points || 0}
                  </Typography>
                </Box>
              </Box>

              {/* Add Settings Button for Admin */}
              {dashboardData.role === "admin" && (
                <Button
                  variant="contained"
                  sx={{
                    marginTop: "20px",
                    backgroundColor: "#5b21b6",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#4a148c" },
                  }}
                  onClick={() => navigate("/settings")}
                >
                  Go to Settings
                </Button>
              )}
            </Box>
          </Card>
        </Box>

        <Box
  sx={{
    display: "flex",
    gap: "20px",
    justifyContent: "center",
    alignItems: "flex-start", // Align items at the top
    marginTop: "20px",
    padding: "20px",
  }}
>
  {/* Chart Section */}
  <Card
    sx={{
      flex: "1 1 70%", // Use half of the space
      borderRadius: "20px",
      padding: "0", // Remove padding to let the content fill the card
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
      height: "540px", // Set consistent height
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
     <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center", // Center the text and icon
        margin: "15px 0",
      }}
    >
      <TrendingUp
        sx={{
          marginRight: "8px",
          color: "#3b82f6", // Trendy blue color
          fontSize: "24px", // Adjust the size of the icon
        }}
      />
      <Typography
        variant="h6"
        sx={{
          fontWeight: "bold",
        }}
      >
        Monthly Trends
      </Typography>
    </Box>
    <Box
      sx={{
        flex: 1, // Ensure the chart takes up all available space
        padding: "10px", // Add slight padding to avoid edges
      }}
    >
      <Line
        data={chartData}
        options={{
          ...chartOptions,
          maintainAspectRatio: false, // Allow the chart to stretch
        }}
      />
    </Box>
  </Card>

  {/* Top Users Section */}
  <Card
    sx={{
      flex: "1 1 30%", // Use half of the space
      borderRadius: "20px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
      minHeight: "450px", // Ensure a minimum height for balance
      height: "500px", // Dynamically calculate height
      padding: "20px",
    }}
  >
     <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center", // Center the text and icon
      marginBottom: "15px",
    }}
  >
    <EmojiEvents
      sx={{
        marginRight: "8px",
        color: "#fcd34d", // Golden crown color
        fontSize: "24px", // Adjust the size of the icon
      }}
    />
    <Typography
      variant="h6"
      sx={{
        fontWeight: "bold",
      }}
    >
      Top Users
    </Typography>
  </Box>
  {topUsers.map((user) => (
    <Box
      key={user.id}
      sx={{
        display: "flex",
        alignItems: "center",
        marginBottom: "15px",
        padding: "10px",
        borderRadius: "10px",
        backgroundColor: "#f9f9ff",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Avatar
        src={user.avatar || "https://via.placeholder.com/50"}
        alt={user.username}
        sx={{
          marginRight: "10px",
          width: "50px",
          height: "50px",
          border: "2px solid #ddd",
        }}
      />
      <Box>
        <Typography sx={{ fontWeight: "bold", color: "#333" }}>
          {user.username}
        </Typography>
        <Typography sx={{ color: "#666", fontSize: "14px" }}>
          {user.points} Points
        </Typography>
      </Box>
    </Box>
  ))}
</Card>
</Box>


        
        </Box>
      </Box>
  
  );
};

export default Dashboard;