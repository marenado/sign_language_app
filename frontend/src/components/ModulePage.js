import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import api from "../services/api"; 
import Sidebar from "../components/Sidebar";
import { FaCheckCircle } from "react-icons/fa";

const ModulesPage = () => {
  const [languages, setLanguages] = useState([]);
  const [language, setLanguage] = useState("1"); // Default language ID
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Fetch languages
  const fetchLanguages = async () => {
    try {
      const { data } = await api.get("/users/languages");
      setLanguages(data || []);
      if ((data || []).length > 0) {
        setLanguage(String(data[0].id)); // pick first language as default
      }
    } catch (err) {
      console.error("Failed to fetch languages:", err);
      setError("Failed to load languages.");
      setLoading(false);
    }
  };

  // Fetch modules
  const fetchModules = async (languageId) => {
    if (!languageId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/users/modules", {
        params: { language_id: languageId },
      });
      setModules(data || []);
      setError("");
    } catch (err) {
      console.error("Failed to fetch modules:", err);
      // If backend sent 401 because cookie missing/expired, send to login
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError("Failed to fetch modules. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    fetchModules(language);
  }, [language]);

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleLessonClick = async (lessonId) => {
    try {
      // cookie-auth protected call
      const { data: tasks } = await api.get(`/users/lessons/${lessonId}/tasks`);
      if (tasks && tasks.length > 0) {
        navigate(`/lessons/${lessonId}/tasks/${tasks[0].task_id}`);
      } else {
        alert("No tasks available for this lesson.");
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      if (err?.response?.status === 401) {
        navigate("/login");
        return;
      }
      alert("Failed to load tasks.");
    }
  };

  return (
    
    <PageContainer>
      <Sidebar />
      <Content>
        <Header>
          <h2>Modules</h2>
          <LanguageSelector onChange={handleLanguageChange} value={language}>
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </LanguageSelector>
        </Header>
        {loading ? (
          <Message>Loading...</Message>
        ) : error ? (
          <Message>{error}</Message>
        ) : (
          <ModulesList>
            {modules.map((module) => (
              <ModuleContainer key={module.id} status={module.status}>
                <ModuleHeader>
                  <ModuleTitle>{module.title}</ModuleTitle>
                  <ModuleStatus>
                    {module.lessons_completed}/{module.total_lessons} Lessons
                    Completed
                  </ModuleStatus>
                  <CompletionIcon
                    completed={module.status === "completed" ? "true" : undefined}
                  >
                    <FaCheckCircle />
                  </CompletionIcon>
                </ModuleHeader>
                <LessonsGrid>
                  {module.lessons && module.lessons.length > 0 ? (
                    module.lessons.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        status={lesson.status}
                        onClick={() =>
                          lesson.status !== "locked" && handleLessonClick(lesson.id)
                        }
                      >
                        <LessonTitle>{lesson.title}</LessonTitle>
                        <LessonStatus>
                          {lesson.status === "completed"
                            ? `${lesson.earned_points || 0}/${lesson.total_points || 0} Points`
                            : lesson.status === "in-progress"
                            ? `In Progress (${lesson.earned_points || 0}/${lesson.total_points || 0} Points)`
                            : "Locked"}
                        </LessonStatus>
                      </LessonCard>
                    ))
                  ) : (
                    <Message>No lessons available.</Message>
                  )}
                </LessonsGrid>
              </ModuleContainer>
            ))}
          </ModulesList>
        )}
      </Content>
    </PageContainer>
  );
};

export default ModulesPage;

// Styled Components
const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
`;

const Content = styled.div`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: "linear-gradient(to bottom, white, #E6DFFF)",

`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LanguageSelector = styled.select`
  padding: 0.5rem;
  font-size: 1rem;
`;

const ModulesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const ModuleContainer = styled.div`
  background-color: ${({ status }) =>
    status === "completed" || status === "in-progress"
      ? "#c7adf0"
      : "#d1d5db"};
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ModuleTitle = styled.h3`
  color: #ffffff;
  font-weight: bold;
`;

const ModuleStatus = styled.div`
  font-size: 1rem;
  color: #ffffff;
`;

const CompletionIcon = styled.div`
  color: ${({ completed }) => (completed ? "#34d399" : "#ffffff")};
  font-size: 1.5rem;
`;

const LessonsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const LessonCard = styled.div`
  background-color: ${({ status }) =>
    status === "completed"
      ? "#34d399"
      : status === "in-progress"
      ? "#86efac"
      : "#9ca3af"};
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  color: ${({ status }) =>
    status === "locked" ? "#6b7280" : "#065f46"};
  font-weight: bold;
  cursor: ${({ status }) => (status === "locked" ? "not-allowed" : "pointer")};
`;

const LessonTitle = styled.h4`
  font-size: 1.2rem;
  font-weight: bold;
`;

const LessonStatus = styled.div`
  margin-top: 0.5rem;
  font-size: 1rem;
`;

const Message = styled.div`
  text-align: center;
  font-size: 1.25rem;
  color: #999;
`;
