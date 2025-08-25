import React, { useState, useEffect, useContext, createContext } from "react";
import styled from "styled-components";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import TypedText from "./components/TypedText";

import SignUp from "./components/SignUp";
import DictionaryPage from "./components/DictionaryPage";
import TasksPage from "./components/TasksPage";
import Dashboard from "./components/Dashboard";
import TaskList from "./components/TaskList";
import Settings from "./components/Settings";
import EmailVerified from "./components/EmailVerified";
import ModulePage from "./components/ModulePage";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import ModuleManagement from "./components/ModuleManagement";
import api from "./services/api"; // axios with { withCredentials: true }

//
// -------- Auth context (use in Sidebar for logout) --------
//
export const AuthContext = createContext({ auth: { ready:false, authenticated:false, isAdmin:false }, logout: () => {} });

//
// -------- Login screen --------
//
const Login = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // If session cookies already exist (e.g. after Google redirect), route user in
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/me"); // 401 if not authed
        if (!alive) return;
        onLoggedIn(!!data.is_admin);
        navigate(data.is_admin ? "/admin/modules" : "/dashboard", { replace: true });
      } catch { /* keep form */ }
    })();
    return () => { alive = false; };
  }, [navigate, onLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/auth/login", { email, password }); // sets cookies
      const { data } = await api.get("/auth/me");
      onLoggedIn(!!data.is_admin);
      navigate(data.is_admin ? "/admin/modules" : "/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error:", error.response?.data?.detail || error.message);
      setMessage("Invalid email or password. Please try again.");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "https://signlearn.onrender.com/auth/google/login";
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
            <SocialButton className="google" onClick={handleGoogleLogin}>
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

//
// -------- Simple route guards --------
//
function Protected({ authenticated, children }) {
  return authenticated ? children : <Navigate to="/login" replace />;
}
function AdminOnly({ authenticated, isAdmin, children }) {
  if (!authenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
function UserOnly({ authenticated, isAdmin, children }) {
  if (!authenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin/modules" replace />;
  return children;
}

//
// -------- App --------
//
const App = () => {
  const [auth, setAuth] = useState({ ready: false, authenticated: false, isAdmin: false });

  // Bootstrap from cookie-backed session
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (!alive) return;
        setAuth({ ready: true, authenticated: true, isAdmin: !!data.is_admin });
      } catch {
        if (!alive) return;
        setAuth({ ready: true, authenticated: false, isAdmin: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setAuth({ ready: true, authenticated: false, isAdmin: false });
  };

  if (!auth.ready) return <div>Loading…</div>;

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      <Router>
        <Routes>
          {/* Root → send to login so / and /login both work */}
          <Route
            path="/"
            element={
              auth.authenticated
                ? <Navigate to={auth.isAdmin ? "/admin/modules" : "/dashboard"} replace />
                : <Navigate to="/login" replace />
            }
          />

          {/* Login & public auth pages */}
          <Route
            path="/login"
            element={
              auth.authenticated
                ? <Navigate to={auth.isAdmin ? "/admin/modules" : "/dashboard"} replace />
                : <Login onLoggedIn={(isAdmin) => setAuth({ ready: true, authenticated: true, isAdmin })} />
            }
          />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<EmailVerified />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin */}
          <Route
            path="/admin/modules"
            element={
              <AdminOnly authenticated={auth.authenticated} isAdmin={auth.isAdmin}>
                <ModuleManagement />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminOnly authenticated={auth.authenticated} isAdmin={auth.isAdmin}>
                <Settings />
              </AdminOnly>
            }
          />
          <Route
            path="/admin/lessons/:lessonId/tasks"
            element={
              <AdminOnly authenticated={auth.authenticated} isAdmin={auth.isAdmin}>
                <TaskList />
              </AdminOnly>
            }
          />

          {/* User */}
          <Route
            path="/dashboard"
            element={
              <UserOnly authenticated={auth.authenticated} isAdmin={auth.isAdmin}>
                <Dashboard />
              </UserOnly>
            }
          />
          <Route
            path="/users/profile"
            element={
              <UserOnly authenticated={auth.authenticated} isAdmin={auth.isAdmin}>
                <Settings />
              </UserOnly>
            }
          />
          <Route
            path="/modules"
            element={
              <UserOnly authenticated={auth.authenticated} isAdmin={auth.isAdmin}>
                <ModulePage />
              </UserOnly>
            }
          />

          {/* Shared (must be signed in, any role) */}
          <Route
            path="/lessons/:lessonId/tasks/:taskId"
            element={
              <Protected authenticated={auth.authenticated}>
                <TasksPage />
              </Protected>
            }
          />
          <Route
            path="/dictionary"
            element={
              <Protected authenticated={auth.authenticated}>
                <DictionaryPage />
              </Protected>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;

//
// ------- styles (unchanged) -------
//
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