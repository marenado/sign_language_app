import React, { useState, useEffect } from "react";
import TypedText from "./components/TypedText";
import styled from "styled-components";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";

import SignUp from "./components/SignUp";
import DictionaryPage from "./components/DictionaryPage";
import TasksPage from "./components/TasksPage";
import Dashboard from "./components/Dashboard";
import TaskList from "./components/TaskList";
// import TaskCreation from "./components/TaskCreation";
import Settings from "./components/Settings";
import EmailVerified from "./components/EmailVerified";
import ModulePage from "./components/ModulePage";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import ModuleManagement from "./components/ModuleManagement";
import api from "./services/api"; // axios instance with withCredentials: true


// Detect if the backend session cookies exist
const hasSession = () =>
  document.cookie.includes("sl_access=") || document.cookie.includes("sl_refresh=");

const Login = ({ setIsAdmin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // If session cookies already exist (e.g., after Google redirect), route user in
 useEffect(() => {
  // Only try to hydrate if we actually have session cookies (e.g., after Google login)
  if (!hasSession()) return;

  let alive = true;
  (async () => {
    try {
      const { data } = await api.get("/auth/me"); // backend reads cookie
      if (!alive) return;
      setIsAdmin(data.is_admin);
      navigate(data.is_admin ? "/admin/modules" : "/dashboard");
    } catch {
      // not logged in yet — keep the form
    }
  })();

  return () => { alive = false; };
}, [navigate, setIsAdmin]);


  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      // Backend sets HttpOnly cookies
      await api.post("/auth/login", { email, password });

      // Hydrate user from cookie-backed session
      const { data } = await api.get("/auth/me");
      setIsAdmin(data.is_admin);
      navigate(data.is_admin ? "/admin/modules" : "/dashboard");
    } catch (error) {
      console.error("Login error:", error.response?.data?.detail || error.message);
      setMessage("Invalid email or password. Please try again.");
    }
  };

  const handleFacebookLogin = () => {
    window.location.href = "https://signlearn.onrender.com/auth/facebook/login";
  };

  return (
    <Container>
      <LeftSection>
        <h1>SignLearn</h1>
        <p>Unlock the Language of Hands</p>
        <Description>
          <TypedText
            text="SignLearn is your gateway to mastering the world of sign languages. Uniquely offering one platform for multiple sign languages, we make learning seamless, interactive, and engaging. Dive into immersive lessons, sharpen your skills with hands-on practice, and experience the joy of connecting through the universal language of gestures. SignLearn is where your journey to communication begins!"
            speed={20}
          />
        </Description>
      </LeftSection>

      <RightSection>
        <Form onSubmit={handleLogin}>
          <h2>Sign in</h2>
          <Input
            type="text"
            placeholder="Email or username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit">Sign in</Button>
          {message && <Message>{message}</Message>}

          <ForgotPasswordLink onClick={() => navigate("/forgot-password")}>
            Forgot Password?
          </ForgotPasswordLink>

          <Separator>Or continue with</Separator>
          <SocialButtons>
            <SocialButton
              className="google"
              onClick={() => (window.location.href = "https://signlearn.onrender.com/auth/google/login")}
            >
              Sign in with Google
            </SocialButton>
            <SocialButton className="facebook" onClick={handleFacebookLogin}>
              Sign in with Facebook
            </SocialButton>
          </SocialButtons>
          <SignUpButton onClick={() => navigate("/signup")}>
            Create a new account
          </SignUpButton>
        </Form>
      </RightSection>
    </Container>
  );
};

const App = () => {
  const [isAdmin, setIsAdmin] = useState(null);

  // Bootstrap auth state from cookies
  useEffect(() => {
  // If no cookies, we’re clearly logged out; don’t spam /auth/me
  if (!hasSession()) { 
    setIsAdmin(false);
    return;
  }

  let alive = true;
  (async () => {
    try {
      const { data } = await api.get("/auth/me");
      if (!alive) return;
      setIsAdmin(data.is_admin);
    } catch {
      if (!alive) return;
      setIsAdmin(false);
    }
  })();

  return () => { alive = false; };
}, []);


  if (isAdmin === null) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Login and Signup */}
        <Route path="/" element={<Login setIsAdmin={setIsAdmin} />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Admin Routes */}
        <Route
          path="/admin/modules"
          element={isAdmin ? <ModuleManagement /> : <div>Access Denied</div>}
        />
        <Route
          path="/admin/settings"
          element={isAdmin ? <Settings /> : <div>Access Denied</div>}
        />

        {/* User Routes */}
        <Route
          path="/dashboard"
          element={!isAdmin ? <Dashboard /> : <div>Access Denied</div>}
        />
        <Route
          path="/users/profile"
          element={!isAdmin ? <Settings /> : <div>Access Denied</div>}
        />

        {/* Shared Routes */}
        <Route
          path="/admin/lessons/:lessonId/tasks"
          element={isAdmin ? <TaskList /> : <div>Access Denied</div>}
        />
        <Route path="/verify-email" element={<EmailVerified />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/modules" element={!isAdmin ? <ModulePage /> : <div>Access Denied</div>} />
        <Route path="/lessons/:lessonId/tasks/:taskId" element={<TasksPage />} />
        <Route path="/dictionary" element={<DictionaryPage />} />
      </Routes>
    </Router>
  );
};

export default App;

/* ------- styles (unchanged) ------- */
const Container = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: #1e133f;
  color: #fff;
`;
const LeftSection = styled.div`
  flex: 1;
  height: 100%;
  padding: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  h1 { font-size: 2.5rem; margin-bottom: 10px; }
  p { font-size: 1.2rem; margin-bottom: 20px; }
`;
const Description = styled.p` line-height: 1.5; font-size: 1rem; `;
const RightSection = styled.div`
  flex: 1; background-color: #f8f9fa; color: #333;
  display: flex; justify-content: center; align-items: center; height: 100%;
`;
const Form = styled.form`
  width: 80%; max-width: 400px; text-align: center;
  h2 { font-size: 1.8rem; margin-bottom: 20px; }
`;
const Input = styled.input`
  width: 100%; padding: 10px; margin: 10px 0;
  border: 1px solid #ccc; border-radius: 5px; font-size: 1rem;
`;
const Button = styled.button`
  width: 100%; padding: 10px; background-color: #4a316f; color: #fff;
  border: none; border-radius: 5px; font-size: 1rem; cursor: pointer;
  &:hover { background-color: #3a2559; }
`;
const Separator = styled.div` margin: 20px 0; font-size: 0.9rem; color: #666; `;
const SocialButtons = styled.div` display: flex; flex-direction: column; `;
const SocialButton = styled.button`
  width: 100%; padding: 10px; margin: 5px 0; border: none; border-radius: 5px; font-size: 1rem; cursor: pointer;
  &.google { background-color: #dd4b39; color: #fff; }
  &.facebook { background-color: #3b5998; color: #fff; }
  &:hover { opacity: 0.9; }
`;
const SignUpButton = styled.button`
  margin-top: 20px; background: none; border: 1px solid #4a316f; color: #4a316f;
  padding: 10px; border-radius: 5px; font-size: 1rem; cursor: pointer;
  &:hover { background-color: #4a316f; color: #fff; }
`;
const Message = styled.p` color: red; margin-top: 15px; `;
const ForgotPasswordLink = styled.div`
  margin-top: 10px; color: #4a316f; cursor: pointer; font-size: 0.9rem;
  &:hover { text-decoration: underline; }
`;
