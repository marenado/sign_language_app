import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "./Sidebar"; // Import Sidebar
import { Line } from "react-chartjs-2";
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
import { Avatar, Box, Card, CardContent, Typography } from "@mui/material";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("No authentication token found. Please log in.");
        }

        const response = await axios.get("http://127.0.0.1:8000/users/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setDashboardData(response.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
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
      {
        label: "Time Spent (hours)",
        data: [...Array(11).fill(0), dashboardData.total_time_spent || 0],
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.2)",
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
        text: "Monthly Trends",
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
        backgroundColor: "#f7f7f7",
        overflow: "hidden",
      }}
    >
      <Sidebar /> {/* Use Sidebar */}
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
            </Box>
          </Card>
        </Box>

        {/* Chart */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Card sx={{ borderRadius: "20px", padding: "20px", maxWidth: "800px", width: "100%" }}>
            <CardContent>
              <Line data={chartData} options={chartOptions} />
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
