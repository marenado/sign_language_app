import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import Sidebar from "./Sidebar";

const BASE_URL = "https://signlearn.onrender.com";
const COLORS = ["#007bff", "#28a745", "#ff7f0e", "#17a2b8"]; // Colors for matching tasks

const TasksPage = () => {
 // const { taskId } = useParams();
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
  const [userProgress, setUserProgress] = useState([]); // Track completed task IDss
  const [showFeedback, setShowFeedback] = useState(false);
  const { lessonId, taskId } = useParams(); // Extract lessonId and taskId
const authToken = localStorage.getItem("authToken"); 
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const navigate = useNavigate();

  const fetchTask = async () => {
    if (!lessonId || !taskId) {
        console.error("Invalid lessonId or taskId:", { lessonId, taskId });
        setError("Invalid lesson or task. Please try again.");
        return;
    }

    if (!authToken) {
        console.error("No auth token found!");
        setError("Authentication error. Please log in again.");
        return;
    }

    try {
        const [taskResponse, lessonTasksResponse] = await Promise.all([
            axios.get(`${BASE_URL}/users/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            }),
            axios.get(`${BASE_URL}/users/lessons/${lessonId}/tasks`, {
                headers: { Authorization: `Bearer ${authToken}` },
            }),
        ]);

        const taskData = taskResponse.data;
        // console.log("Fetched Task:", taskData); // Debugging Task Response
        // console.log("Lesson Tasks:", lessonTasksResponse.data);

        setTask(taskData);
        setTaskIds(lessonTasksResponse.data.map((t) => t.task_id));

        // Correctly set video URL
        const videoId =
            taskData?.content?.video_id || // Use video_id from content
            (taskData?.videos?.length > 0 ? taskData.videos[0].video_id : null);
        if (videoId) {
            setVideoUrl(`https://asl-video-dataset.s3.us-east-1.amazonaws.com/videos/${videoId}.mp4`);
        } else {
            console.warn("No video ID found for this task. Check API response.", taskData);
            setVideoUrl(""); // Ensure no broken video placeholder
        }

        setIsLoading(false);
    } catch (err) {
        console.error("Error fetching task:", err);
        setError("Failed to load the task. Please try again.");
        setIsLoading(false);
    }
};


// Fetch task on component mount
useEffect(() => {
    if (lessonId && taskId) {
        fetchTask();
    }
}, [lessonId, taskId]);
 // Ensure API is only called when IDs exist
  
  // Function to check if the user has completed the previous task
  const userHasCompletedPreviousTask = (index) => {
    if (index === 0) return true; // First task is always accessible
    return userProgress.includes(taskIds[index - 1]); // Check if previous task is completed
  };
  
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
      window.history.pushState(null, "", window.location.href);
    };
  }, []);

  useEffect(() => {
    if (task?.task_type === "sign_speed_challenge" && task?.content?.time_limit) {
        setTimeLeft(task.content.time_limit);
        setIsTimerRunning(true);
    }
}, [task]);


useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }

    if (timeLeft === 0 && isTimerRunning) {
        setIsTimerRunning(false);
        handleTaskFeedback(false, task?.correct_answer?.option || "Unknown");
    }
}, [timeLeft, isTimerRunning]);

  
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

  const handleTaskFeedback = (isCorrect, correctAnswer, message) => {
    setFeedback(
      isCorrect
        ? "Correct! Well done!"
        : `Incorrect! The correct answer is: ${correctAnswer || "Unknown"}`
    );
    setShowFeedback(true);
  
    // Hide feedback after 3 seconds
    setTimeout(() => {
      setShowFeedback(false);
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
    const assignedColor = COLORS[colorIndex];

    setVideoWordMap((prev) => ({
      ...prev,
      [selectedVideo]: { word, color: assignedColor },
    }));

    setSelectedVideo(null);
  };

  const handleSubmitMatchingTask = () => {
    const isCorrect = task?.content?.pairs.every(
      (pair) => videoWordMap[pair.video.id]?.word === pair.word
    );

    setFeedback(isCorrect ? "Correct! Well done!" : "Incorrect! Please review your matches.");
    setTimeout(() => {
      setFeedback("");
      handleNextTask();
    }, 3000);
  };

  const handleSubmitRecognitionTask = () => {
    if (!selectedOption) {
      setFeedback("Please select an option.");
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
      return;
    }
  
    const correctAnswer = task?.correct_answer?.option || "Unknown"; // Ensure fallback value
    const isCorrect = selectedOption === task?.correct_answer?.option;
  
    handleTaskFeedback(isCorrect, correctAnswer, `Incorrect! The correct answer is: ${correctAnswer}`);
  };
  


  const handleSubmitVideoToSignTask = () => {
    const correctAnswer = task?.videos?.[0]?.gloss || "";
  
    const isCorrect = userInput.trim().toLowerCase() === correctAnswer.toLowerCase();
    const message = isCorrect
      ? "Correct! Great job!"
      : `Incorrect! The correct answer is: ${correctAnswer}`;
  
    handleTaskFeedback(isCorrect, message); // Use handleTaskFeedback
  };
  

  const handleSubmitSpeedChallenge = () => {
    if (!selectedOption) {
        setFeedback("Please select an option.");
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 3000);
        return;
    }

    const isCorrect = selectedOption === task?.correct_answer?.option;
    const message = isCorrect
        ? "Correct! Well done!"
        : `Incorrect!`;

    setIsTimerRunning(false); // Stop the timer
    handleTaskFeedback(isCorrect, message);
};

  const handleNextTask = () => {
    const currentIndex = taskIds.indexOf(parseInt(taskId));
    if (currentIndex >= 0 && currentIndex < taskIds.length - 1) {
        navigate(`/lessons/${lessonId}/tasks/${taskIds[currentIndex+1]}`);
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
          <TaskHeader>
            {task?.task_type === "video_recognition"
              ? "Recognize the Sign"
              : task?.task_type === "sign_presentation"
              ? "Learn the Sign"
              : task?.task_type === "matching"
              ? "Match the Sign to the Word"
              : task?.task_type === "video_to_sign"
              ? "Type the Sign"
              : task?.task_type === "sign_speed_challenge"
              ? "Sign Speed Challenge"
              : "Task"}
          </TaskHeader>
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
              {showFeedback && <PopupMessage>{feedback}</PopupMessage>}
            </RecognitionContainer>
          )}
        {task?.task_type === "matching" && (
            <MatchingContainer>
              <TaskInstruction>
                Match the videos with their corresponding words:
              </TaskInstruction>
              <VideosContainer>
                {task?.content?.pairs?.map((pair, index) => (
                  <VideoItem
                    key={index}
                    onClick={() => handleVideoSelect(pair.video.id)}
                    selected={selectedVideo === pair.video.id}
                    highlightColor={videoHighlightMap[pair.video.id] || "#ddd"}
                  >
                    <Video autoPlay loop muted>
                      <source
                        src={`https://asl-video-dataset.s3.us-east-1.amazonaws.com/videos/${pair.video.id}.mp4`}

                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </Video>
                  </VideoItem>
                ))}
              </VideosContainer>
              <WordsContainer>
                {task?.content?.pairs?.map((pair, index) => (
                  <WordButton
                    key={index}
                    onClick={() => handleWordSelect(pair.word)}
                    selected={Object.values(videoWordMap)
                      .map((map) => map.word)
                      .includes(pair.word)}
                    highlightColor={
                      Object.values(videoWordMap).find((map) => map.word === pair.word)?.color ||
                      "#e0e0e0"
                    }
                  >
                    {pair.word}
                  </WordButton>
                ))}
              </WordsContainer>
              <SubmitButton onClick={handleSubmitMatchingTask}>Check</SubmitButton>
              {feedback && <PopupMessage>{feedback}</PopupMessage>}
            </MatchingContainer>
          )}
          {task?.task_type === "video_to_sign" && (
            <VideoToSignContainer>
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </Video>
              </VideoContainer>
              <InputContainer>
                <AnswerInput
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type the sign here..."
                />
                <SubmitButton onClick={handleSubmitVideoToSignTask}>Submit</SubmitButton>
              </InputContainer>
              {showFeedback && <PopupMessage>{feedback}</PopupMessage>}

            </VideoToSignContainer>
          )}
          {task?.task_type === "sign_speed_challenge" && (
            <SpeedChallengeContainer>
                {/* <TaskDescription>
      Watch the video and select the correct sign before time runs out!
    </TaskDescription> */}
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </Video>
              </VideoContainer>
              <TimerBar>
                <ProgressBar width={(timeLeft / task.content.time_limit) * 100} />
              </TimerBar>
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
              <SubmitButton onClick={handleSubmitSpeedChallenge}>Check</SubmitButton>
              {showFeedback && <PopupMessage>{feedback}</PopupMessage>}
            </SpeedChallengeContainer>
          )}
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



const TaskDescription = styled.p`
  font-size: 1.2rem;
  color: #555;
  margin-bottom: 10px;
  text-align: center;
  width: 90%;
`;


const TimerBar = styled.div`
  width: 100%;
  max-width: 600px;
  height: 20px;
  background-color: #ddd;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
  `
;

const ProgressBar = styled.div`
  height: 100%;
  background-color: #28a745;
  width: ${(props) => props.width}%;
  transition: width 0.5s ease-in-out;`
;

