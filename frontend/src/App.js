import React, { useState, useEffect } from "react";
import TypedText from "./components/TypedText";
import axios from "axios";
import styled from "styled-components";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import SignUp from "./components/SignUp";
import Dashboard from "./components/Dashboard"
import Settings from "./components/Settings";
import ModuleManagement  from "./components/ModuleManagement";


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate(); 

  // Function to handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://127.0.0.1:8000/auth/login", {
        email,
        password,
      });

      const { access_token } = response.data;

      // Decode JWT to extract user role
      const decodedToken = JSON.parse(atob(access_token.split(".")[1])); // Decode JWT payload
      const isAdmin = decodedToken.is_admin;

      localStorage.setItem("authToken", access_token); // Store token
      localStorage.setItem("isAdmin", isAdmin); // Store admin flag

      setMessage("Login successful! Redirecting...");
      console.log("Token:", access_token);

      // Redirect based on role
      if (isAdmin) {
        navigate("/admin/modules");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setMessage("Invalid email or password. Please try again.");
      console.error("Error:", error.response?.data?.detail || error.message);
    }
  };

  const handleGoogleSignIn = (e) => {
    e.preventDefault(); 
    window.location.href = "http://127.0.0.1:8000/auth/google/login";
  };
  
  const handleFacebookSignIn = (e) => {
    e.preventDefault(); 
    window.location.href = "http://127.0.0.1:8000/auth/facebook/login";
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
          <Separator>Or continue with</Separator>
          <SocialButtons>
            <SocialButton className="google" onClick={handleGoogleSignIn}>
              Sign in with Google
            </SocialButton>
            <SocialButton className="facebook" onClick={handleFacebookSignIn}>
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

  // Check user role on app load
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const adminFlag = localStorage.getItem("isAdmin") === "true";
    setIsAdmin(adminFlag);
  }, []);

  if (isAdmin === null) {
    // Wait for role determination
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Admin Route */}
        <Route
          path="/admin/modules"
          element={
            isAdmin ? <ModuleManagement /> : <div>Access Denied</div>
          }
        />

        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            isAdmin ? <div>Access Denied</div> : <Dashboard />
          }
        />
        <Route
          path="/settings"
          element={
            isAdmin ? <div>Access Denied</div> : <Settings />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;



const Container = styled.div`
  display: flex;
  height: 100vh;
  background-color: #1e133f;
  color: #fff;
`;

const LeftSection = styled.div`
  flex: 1;
  padding: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }
  p {
    font-size: 1.2rem;
    margin-bottom: 20px;
  }
`;

const Description = styled.p`
  line-height: 1.5;
  font-size: 1rem;
`;

const RightSection = styled.div`
  flex: 1;
  background-color: #f8f9fa;
  color: #333;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Form = styled.form`
  width: 80%;
  max-width: 400px;
  text-align: center;
  h2 {
    font-size: 1.8rem;
    margin-bottom: 20px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
`;

const Button = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #4a316f;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;

  &:hover {
    background-color: #3a2559;
  }
`;

const Separator = styled.div`
  margin: 20px 0;
  font-size: 0.9rem;
  color: #666;
`;

const SocialButtons = styled.div`
  display: flex;
  flex-direction: column;
`;

const SocialButton = styled.button`
  width: 100%;
  padding: 10px;
  margin: 5px 0;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;

  &.google {
    background-color: #dd4b39;
    color: #fff;
  }
  &.facebook {
    background-color: #3b5998;
    color: #fff;
  }

  &:hover {
    opacity: 0.9;
  }
`;

const SignUpButton = styled.button`
  margin-top: 20px;
  background: none;
  border: 1px solid #4a316f;
  color: #4a316f;
  padding: 10px;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;

  &:hover {
    background-color: #4a316f;
    color: #fff;
  }
`;

const Message = styled.p`
  color: red;
  margin-top: 15px;
`;