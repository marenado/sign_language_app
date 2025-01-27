import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import Sidebar from "./Sidebar";

const BASE_URL = "http://localhost:8000";
const COLORS = ["#007bff", "#28a745", "#ff7f0e", "#17a2b8"]; // Colors for matching tasks

const TasksPage = () => {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [taskIds, setTaskIds] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoWordMap, setVideoWordMap] = useState({});
  const [videoHighlightMap, setVideoHighlightMap] = useState({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const navigate = useNavigate();

  const fetchTask = async () => {
    try {
      const [taskResponse, lessonTasksResponse] = await Promise.all([
        axios.get(`${BASE_URL}/users/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }),
        axios.get(`${BASE_URL}/users/lessons/1/tasks`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
        }),
      ]);

      const taskData = taskResponse.data;
      const lessonTasks = lessonTasksResponse.data;

      // Reset state for new task
      resetTaskState();

      // Handle video URL
      const videoId = taskData?.content?.video_id;
      setVideoUrl(videoId ? `https://asl-video-dataset.s3.us-east-1.amazonaws.com/videos/${videoId}.mp4` : "");

      // Set timer for speed challenge
      if (taskData.task_type === "sign_speed_challenge") {
        setTimeLeft(taskData.content.time_limit);
        setIsTimerRunning(true);
      }

      setTask(taskData);
      setTaskIds(lessonTasks.map((t) => t.task_id));
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching task:", err);
      setError("Failed to load the task. Please try again.");
      setIsLoading(false);
    }
  };

  const resetTaskState = () => {
    setVideoWordMap({});
    setVideoHighlightMap({});
    setSelectedVideo(null);
    setSelectedOption(null);
    setUserInput("");
    setFeedback("");
    setError("");
  };

  useEffect(() => {
    setIsLoading(true);
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      handleTaskFeedback(false, `Time's up! The correct answer is: ${task?.correct_answer?.option}`);
    }
  }, [timeLeft, isTimerRunning]);

  const handleTaskFeedback = (isCorrect, message) => {
    setFeedback(isCorrect ? "Correct! Well done!" : message || "Incorrect! Please review your answer.");
    setTimeout(() => {
      setFeedback("");
      handleNextTask();
    }, 3000);
  };

  const markLessonComplete = async () => {
    try {
      await axios.post(
        `${BASE_URL}/users/lessons/1/complete`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } }
      );
      navigate("/modules");
    } catch (err) {
      console.error("Error marking lesson as complete:", err);
      setError(
        err.response?.status === 400
          ? "You haven't scored enough points to complete this lesson."
          : "Failed to mark the lesson as complete. Please try again."
      );
    }
  };

  const handleVideoSelect = (videoId) => {
    const colorIndex = Object.keys(videoWordMap).length % COLORS.length;
    setSelectedVideo(videoId);
    setVideoHighlightMap((prev) => ({ ...prev, [videoId]: COLORS[colorIndex] }));
  };

  const handleWordSelect = (word) => {
    if (!selectedVideo) {
      setFeedback("Please select a video first!");
      return;
    }
    const colorIndex = Object.keys(videoWordMap).length % COLORS.length;
    setVideoWordMap((prev) => ({ ...prev, [selectedVideo]: { word, color: COLORS[colorIndex] } }));
    setSelectedVideo(null);
  };

  const handleSubmitMatchingTask = () => {
    const isCorrect = task?.content?.pairs.every(
      (pair) => videoWordMap[pair.video.id]?.word === pair.word
    );
    handleTaskFeedback(isCorrect, "Incorrect! Please review your matches.");
  };

  const handleSubmitRecognitionTask = () => {
    if (!selectedOption) return setFeedback("Please select an option.");
    const isCorrect = selectedOption === task?.correct_answer?.option;
    handleTaskFeedback(isCorrect, `Incorrect! The correct answer is: ${task?.correct_answer?.option}`);
  };

  const handleSubmitVideoToSignTask = () => {
    const correctAnswer = task?.videos?.[0]?.gloss || "";
    const isCorrect = userInput.trim().toLowerCase() === correctAnswer.toLowerCase();
    handleTaskFeedback(isCorrect, `Incorrect! The correct answer is: ${correctAnswer}`);
  };

  const handleSubmitSpeedChallenge = () => {
    if (!selectedOption) return setFeedback("Please select an option.");
    const isCorrect = selectedOption === task?.correct_answer?.option;
    setIsTimerRunning(false);
    handleTaskFeedback(isCorrect, `Incorrect! The correct answer is: ${task?.correct_answer?.option}`);
  };

  const handleNextTask = () => {
    const currentIndex = taskIds.indexOf(parseInt(taskId));
    if (currentIndex >= 0 && currentIndex < taskIds.length - 1) {
      navigate(`/tasks/${taskIds[currentIndex + 1]}`);
    } else {
      markLessonComplete();
    }
  };

  if (isLoading) return <LoadingContainer>Loading...</LoadingContainer>;
  if (error) return <ErrorContainer>{error}</ErrorContainer>;

  return (
    <PageContainer>
      <Sidebar />
      <MainContent>
        <HeaderContainer>
          <TaskHeader>{task?.task_type?.replace("_", " ").toUpperCase() || "Task"}</TaskHeader>
        </HeaderContainer>
        <ContentContainer>
          {task?.task_type === "sign_presentation" && (
            <SignPresentationContainer>
              <SignMeaning>{task?.videos?.[0]?.gloss || "Learn this sign"}</SignMeaning>
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </Video>
              </VideoContainer>
              <NextButton onClick={handleNextTask}>Next</NextButton>
            </SignPresentationContainer>
          )}
          {task?.task_type === "video_recognition" && (
            <RecognitionContainer>
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </Video>
              </VideoContainer>
              <OptionsContainer>
                {task?.content?.options?.map((option) => (
                  <OptionButton
                    key={option}
                    onClick={() => setSelectedOption(option)}
                    selected={selectedOption === option}
                  >
                    {option}
                  </OptionButton>
                ))}
              </OptionsContainer>
              <SubmitButton onClick={handleSubmitRecognitionTask}>Check</SubmitButton>
              {feedback && <PopupMessage>{feedback}</PopupMessage>}
            </RecognitionContainer>
          )}
          {/* Add other task type components (e.g., matching, speed challenge) as shown in the original logic */}
        </ContentContainer>
      </MainContent>
    </PageContainer>
  );
};

export default TasksPage;

// Styled components remain unchanged from the original implementation.




// Styled components (unchanged)
const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
`;


const RecognitionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
`;

const VideoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 450px;
  margin: 10px 0;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
`;

const Video = styled.video`
  width: 100%;
  height: auto;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

const OptionButton = styled.button`
  background-color: ${(props) => (props.selected ? "#007bff" : "#e0e0e0")};
  color: ${(props) => (props.selected ? "white" : "#333")};
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => (props.selected ? "#0056b3" : "#d6d6d6")};
  }
`;

const SubmitButton = styled.button`
  background-color: #28a745;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #218838;
  }
`;

const Feedback = styled.div`
  font-size: 1rem;
  color: ${(props) => (props === "Correct! Great job!" ? "#28a745" : "#f44336")};
  margin-top: 10px;
  text-align: center;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const TaskHeader = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const ErrorContainer = styled.div`
  color: red;
  text-align: center;
  font-size: 1.2rem;
`;

const LoadingContainer = styled.div`
  text-align: center;
  font-size: 1.2rem;
`;


const Popup = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    border: 2px solid #ddd;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    padding: 20px;
    border-radius: 8px;
    z-index: 1000;
`;

const PopupMessage = styled.p`
    font-size: 1.2rem;
    font-weight: bold;
    color: #333;
    text-align: center;
`;


const SignPresentationContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Align items towards the top */
  padding: 20px;
  gap: 30px;
  text-align: center;
  height: 100%; /* Ensures it fills the parent container */
  margin-top: -50px; /* Adjust this value to move it higher */
`;



const SignMeaning = styled.h2`
  font-size: 2rem; /* Larger font size for better visibility */
  font-weight: bold;
  color: #333;
  margin-bottom: 20px; /* Add space below the title */
`;


const NextButton = styled.button`
    background-color: #007bff;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    border: none;
    transition: background-color 0.3s;

    &:hover {
        background-color: #0056b3;
    }
`;

const MatchingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
`;

const TaskInstruction = styled.p`
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
  color: #333;
`;

const VideosContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

const VideoItem = styled.div`
  border: 3px solid ${(props) => props.highlightColor || (props.selected ? "#007bff" : "#ddd")};
  border-radius: 8px;
  cursor: pointer;
  padding: 5px;
  max-width: 200px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
`;


const WordsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

const WordButton = styled.button`
  background-color: ${(props) => props.highlightColor || (props.selected ? "#007bff" : "#e0e0e0")};
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${(props) => (props.highlightColor ? "#0056b3" : "#ccc")};
  }
`;

const VideoToSignContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;


const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;


const AnswerInput = styled.input`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
  width: 80%;
  max-width: 400px;
`;


const SpeedChallengeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const TimerBar = styled.div`
  width: 100%;
  max-width: 600px;
  height: 20px;
  background-color: #ddd;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
`;

const ProgressBar = styled.div`
  height: 100%;
  background-color: #28a745;
  width: ${(props) => props.width}%;
  transition: width 0.5s ease-in-out;
`;