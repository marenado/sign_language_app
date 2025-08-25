import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://signlearn.onrender.com";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // emailStatus: idle | typing | checking | valid | invalid | exists | error
  const [emailStatus, setEmailStatus] = useState("idle");
  const [emailHint, setEmailHint] = useState("");

  const navigate = useNavigate();

  // Debounced email validation as the user types
  useEffect(() => {
    // Reset state if field is empty
    if (!email) {
      setEmailStatus("idle");
      setEmailHint("");
      return;
    }

    // While typing, don't show red yet
    if (!EMAIL_REGEX.test(email)) {
      setEmailStatus("typing");
      setEmailHint("Invalid email format.");
      return;
    }

    let cancelled = false;
    setEmailStatus("checking");
    setEmailHint("Checking…");

    const t = setTimeout(async () => {
      try {
        // 1) External validator — treat timeouts/errors as non-blocking
        const { data: v } = await axios.post(`${API_BASE}/auth/validate-email`, { email }, { timeout: 4500 });
        if (cancelled) return;

        if (v && v.valid) {
          // 2) Check if email already exists in our DB
          const { data: existsRes } = await axios.post(`${API_BASE}/auth/check-email`, { email });
          if (cancelled) return;

          if (existsRes?.exists) {
            setEmailStatus("exists");
            setEmailHint("Email already exists.");
          } else {
            setEmailStatus("valid");
            setEmailHint("");
          }
        } else {
          setEmailStatus("invalid");
          setEmailHint(v?.reason || "Invalid email address.");
        }
      } catch (err) {
        // Network/validator hiccup → don't block the user
        if (cancelled) return;
        setEmailStatus("valid");
        setEmailHint("");
      }
    }, 500); // debounce

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [email]);

  const canSubmit =
    username.trim().length > 0 &&
    password.length >= 8 &&
    email &&
    emailStatus !== "invalid" &&
    emailStatus !== "exists" &&
    emailStatus !== "checking";

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!EMAIL_REGEX.test(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (emailStatus === "invalid" || emailStatus === "exists") {
      setMessage(emailHint || "Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    try {
      await axios.post(`${API_BASE}/auth/signup`, { email, username, password });
      setMessage(
        "Account created successfully! The verification link was sent to your email address. Please verify it."
      );
      // navigate("/") after a short delay if you want
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "An error occurred. Please try again.";
      setMessage(errorMessage);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleSignUp}>
        <h2>Create an Account</h2>

        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value.trim());
            setMessage("");
          }}
          required
        />
        {/* Only show errors when we *know* it's invalid/taken; show soft hint while checking */}
        {emailStatus === "checking" && <Info>Checking…</Info>}
        {emailStatus === "invalid" && <ErrorMessage>{emailHint}</ErrorMessage>}
        {emailStatus === "exists" && <ErrorMessage>{emailHint}</ErrorMessage>}

        <PasswordWrapper>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Requirements>
            Password must be at least 8 characters, include one uppercase letter, one number, and one special character.
          </Requirements>
        </PasswordWrapper>

        <Button type="submit" disabled={!canSubmit}>
          {emailStatus === "checking" ? "Please wait…" : "Sign Up"}
        </Button>

        {message && <Message>{message}</Message>}
      </Form>
    </Container>
  );
};

export default SignUp;

/* --- styles --- */
const Container = styled.div`
  display: flex; justify-content: center; align-items: center;
  height: 100vh; background-color: #1e133f;
`;
const Form = styled.form`
  background: #fff; padding: 2rem; border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,.1); width:100%; max-width: 400px; text-align:center;
  h2 { margin-bottom: 1rem; color: #4a316f; }
`;
const Input = styled.input`
  width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; font-size: 1rem;
`;
const PasswordWrapper = styled.div` position: relative; `;
const Requirements = styled.p` font-size: .8rem; color: #666; text-align: left; margin: 5px 0; `;
const Button = styled.button`
  width: 100%; padding: 10px; background: #4a316f; color: #fff; border: none; border-radius: 5px; font-size: 1rem; cursor: pointer;
  &:hover { background: #3a2559; }
  &:disabled { opacity: .6; cursor: not-allowed; }
`;
const ErrorMessage = styled.p` color: red; font-size: .9rem; margin: 5px 0; `;
const Info = styled.p` color: #666; font-size: .9rem; margin: 5px 0; `;
const Message = styled.p` margin-top: 10px; color: #4a316f; `;
