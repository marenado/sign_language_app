import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import Sidebar from './Sidebar';
import api from '../services/api';
const COLORS = ['#007bff', '#28a745', '#ff7f0e', '#17a2b8'];

const TasksPage = () => {
  const { lessonId, taskId } = useParams();
  const navigate = useNavigate();
  const DEMO_MODE = true;
  const [task, setTask] = useState(null);
  const [taskIds, setTaskIds] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoWordMap, setVideoWordMap] = useState({});
  const [videoHighlightMap, setVideoHighlightMap] = useState({});
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
const [lastAwardedTaskId, setLastAwardedTaskId] = useState(null);

const awardPoints = async (points) => {
  if (!lessonId || !taskId) return;
  if (lastAwardedTaskId === Number(taskId)) return;

  try {
    setSubmitting(true);
    await api.post(`/users/lessons/${lessonId}/tasks/${taskId}/complete`, {
      points_earned: Number(points) || 0,
    });
    setLastAwardedTaskId(Number(taskId));
  } catch (e) {
    console.error('Failed to award points:', e);
  } finally {
    setSubmitting(false);
  }
};

  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const fetchTask = async () => {
    if (!lessonId || !taskId) {
      setError('Invalid lesson or task. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const [taskRes, listRes] = await Promise.all([
        api.get(`/users/tasks/${taskId}`),
        api.get(`/users/lessons/${lessonId}/tasks`),
      ]);

      const t = taskRes.data;
      setTask(t);
      setTaskIds(Array.isArray(listRes.data) ? listRes.data.map((x) => x.task_id) : []);

      const vId = t?.content?.video_id ?? (t?.videos?.length > 0 ? t.videos[0].video_id : null);

      if (vId) {
        setVideoUrl(`https://asl-video-dataset.s3.us-east-1.amazonaws.com/videos/${vId}.mp4`);
      } else {
        setVideoUrl('');
      }

      if (t?.task_type === 'sign_speed_challenge' && t?.content?.time_limit) {
        setTimeLeft(Number(t.content.time_limit));
        setIsTimerRunning(true);
      } else {
        setIsTimerRunning(false);
        setTimeLeft(0);
      }

      setIsLoading(false);
    } catch (e) {
      console.error('Failed to load task:', e);
      setError('Failed to load the task. Please try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setError('');
    resetTaskState();
    fetchTask();
  }, [lessonId, taskId]);

  useEffect(() => {
    if (!isTimerRunning || timeLeft <= 0) return;

    const timer = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  useEffect(() => {
    if (!isTimerRunning || timeLeft !== 0) return;
    // time up
    setIsTimerRunning(false);
    const correct = task?.correct_answer?.option || 'Unknown';
    showFeedbackThenAdvance(false, `Time's up! The correct answer is: ${correct}`);
  }, [timeLeft, isTimerRunning, task]);

  const resetTaskState = () => {
    setVideoWordMap({});
    setVideoHighlightMap({});
    setSelectedVideo(null);
    setSelectedOption(null);
    setUserInput('');
    setFeedback('');
    setShowFeedback(false);
  };

  const showFeedbackThenAdvance = (isCorrect, text) => {
    setFeedback(text ?? (isCorrect ? 'Correct! Well done!' : 'Incorrect!'));
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      handleNextTask();
    }, 3000);
  };

  const markLessonComplete = async () => {
  try {
    await api.post(`/users/lessons/${lessonId}/complete`, {});
    navigate('/modules');
  } catch (err) {
    if (DEMO_MODE && err?.response?.status === 400) {
      // demo bypass: still navigate so you can show progress screen
      navigate('/modules?demo=1');
      return;
    }
    console.error('Error marking lesson as complete:', err);
    setError(
      err?.response?.status === 400
        ? "You haven't scored enough points to complete this lesson."
        : 'Failed to mark the lesson as complete. Please try again.',
    );
  }
};



  const handleNextTask = () => {
    const numericId = Number(taskId);
    const idx = taskIds.indexOf(numericId);
    if (idx >= 0 && idx < taskIds.length - 1) {
      navigate(`/lessons/${lessonId}/tasks/${taskIds[idx + 1]}`);
    } else {
      markLessonComplete();
    }
  };

  const handleVideoSelect = (videoId) => {
    const colorIndex = Object.keys(videoWordMap).length % COLORS.length;
    setSelectedVideo(videoId);
    setVideoHighlightMap((prev) => ({ ...prev, [videoId]: COLORS[colorIndex] }));
  };

  const handleWordSelect = (word) => {
    if (!selectedVideo) {
      setFeedback('Please select a video first!');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
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

  const handleSubmitMatchingTask = async () => {
    const pairs = task?.content?.pairs;
    if (!Array.isArray(pairs) || pairs.length === 0) {
      setFeedback('This task is misconfigured (no pairs).');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2500);
      return;
    }
    const allMatched = pairs.every((p) => videoWordMap[p.video.id]?.word);
    if (!allMatched) {
      setFeedback('Please match each video to a word first.');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
      return;
    }
    const isCorrect = pairs.every((p) => videoWordMap[p.video.id]?.word === p.word);
    if (isCorrect) await awardPoints(task?.points ?? 1); 
    showFeedbackThenAdvance(
      isCorrect,
      isCorrect ? 'Correct! Well done!' : 'Incorrect! Please review your matches.',
    );
  };

  const handleSubmitRecognitionTask = async () => {
  if (!selectedOption) {
    setFeedback('Please select an option.');
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
    return;
  }
  const correct = task?.correct_answer?.option || 'Unknown';
  const isCorrect = selectedOption === correct;

  if (isCorrect) await awardPoints(task?.points ?? 1);
  showFeedbackThenAdvance(
    isCorrect,
    isCorrect ? 'Correct! Well done!' : `Incorrect! The correct answer is: ${correct}`,
  );
};


  const normalize = (s) =>
    (s ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();

  const handleSubmitVideoToSignTask = async () => {
    const input = normalize(userInput);

    // 1) block empty answers
    if (!input) {
      setFeedback('Please type your answer.');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
      return;
    }

    const resolved =
      task?.videos?.[0]?.gloss ?? task?.correct_answer?.option ?? task?.content?.answer ?? null;

    if (!resolved) {
      // task misconfigured on backend/data
      setFeedback('This task is misconfigured (missing correct answer).');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2500);
      return;
    }

    // Optional: support multiple accepted answers
    const accepted = Array.isArray(task?.content?.accepted_answers)
      ? task.content.accepted_answers
      : [resolved];

    const isCorrect = accepted.some((a) => normalize(a) === input);
    if (isCorrect) await awardPoints(task?.points ?? 1); 
    const correctForMessage = accepted[0];

    showFeedbackThenAdvance(
      isCorrect,
      isCorrect ? 'Correct! Great job!' : `Incorrect! The correct answer is: ${correctForMessage}`,
    );
  };

  const handleSubmitSpeedChallenge = async () => {
    if (!selectedOption) {
      setFeedback('Please select an option.');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
      return;
    }
    const correct = task?.correct_answer?.option || 'Unknown';
    const isCorrect = selectedOption === correct;
    if (isCorrect) await awardPoints(task?.points ?? 1); 
    setIsTimerRunning(false);
    showFeedbackThenAdvance(
      isCorrect,
      isCorrect ? 'Correct! Well done!' : `Incorrect! The correct answer is: ${correct}`,
    );
  };

  if (isLoading) return <LoadingContainer>Loading...</LoadingContainer>;
  if (error && !DEMO_MODE) return <ErrorContainer>{error}</ErrorContainer>;


  return (
    <PageContainer>
      <Sidebar />
      <MainContent>
        <HeaderContainer>
          <TaskHeader>
            {task?.task_type === 'video_recognition'
              ? 'Recognize the Sign'
              : task?.task_type === 'sign_presentation'
                ? 'Learn the Sign'
                : task?.task_type === 'matching'
                  ? 'Match the Sign to the Word'
                  : task?.task_type === 'video_to_sign'
                    ? 'Type the Sign'
                    : task?.task_type === 'sign_speed_challenge'
                      ? 'Sign Speed Challenge'
                      : 'Task'}
          </TaskHeader>
        </HeaderContainer>

        <ContentContainer>
          {task?.task_type === 'sign_presentation' && (
            <SignPresentationContainer>
              <SignMeaning>{task?.videos?.[0]?.gloss || 'Learn this sign'}</SignMeaning>
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
                </Video>
              </VideoContainer>
              <NextButton onClick={handleNextTask}>Next</NextButton>
            </SignPresentationContainer>
          )}

          {task?.task_type === 'video_recognition' && (
            <RecognitionContainer>
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
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

          {task?.task_type === 'matching' && (
            <MatchingContainer>
              <TaskInstruction>Match the videos with their corresponding words:</TaskInstruction>
              <VideosContainer>
                {task?.content?.pairs?.map((pair, idx) => (
                  <VideoItem
                    key={idx}
                    onClick={() => handleVideoSelect(pair.video.id)}
                    selected={selectedVideo === pair.video.id}
                    highlightColor={videoHighlightMap[pair.video.id] || '#ddd'}
                  >
                    <Video autoPlay loop muted>
                      <source
                        src={`https://asl-video-dataset.s3.us-east-1.amazonaws.com/videos/${pair.video.id}.mp4`}
                        type="video/mp4"
                      />
                    </Video>
                  </VideoItem>
                ))}
              </VideosContainer>
              <WordsContainer>
                {task?.content?.pairs?.map((pair, idx) => (
                  <WordButton
                    key={idx}
                    onClick={() => handleWordSelect(pair.word)}
                    selected={Object.values(videoWordMap).some((m) => m.word === pair.word)}
                    highlightColor={
                      Object.values(videoWordMap).find((m) => m.word === pair.word)?.color ||
                      '#e0e0e0'
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

          {task?.task_type === 'video_to_sign' && (
            <VideoToSignContainer>
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
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

          {task?.task_type === 'sign_speed_challenge' && (
            <SpeedChallengeContainer>
              <VideoContainer>
                <Video autoPlay loop muted>
                  <source src={videoUrl} type="video/mp4" />
                </Video>
              </VideoContainer>

              <TimerBar>
                <ProgressBar
                  width={
                    task?.content?.time_limit
                      ? (timeLeft / Number(task.content.time_limit)) * 100
                      : 0
                  }
                />
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
  background-color: ${(props) => (props.selected ? '#007bff' : '#e0e0e0')};
  color: ${(props) => (props.selected ? 'white' : '#333')};
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  &:hover {
    background-color: ${(props) => (props.selected ? '#0056b3' : '#d6d6d6')};
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
  justify-content: flex-start;
  padding: 20px;
  gap: 30px;
  text-align: center;
  height: 100%;
  margin-top: -50px;
`;
const SignMeaning = styled.h2`
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
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
  border: 3px solid ${(p) => p.highlightColor || (p.selected ? '#007bff' : '#ddd')};
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
  background-color: ${(p) => p.highlightColor || (p.selected ? '#007bff' : '#e0e0e0')};
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  &:hover {
    background-color: ${(p) => (p.highlightColor ? '#0056b3' : '#ccc')};
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
  width: ${(p) => p.width}%;
  transition: width 0.5s ease-in-out;
`;
