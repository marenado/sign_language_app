import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import api from "../services/api"; 

const API_BASE =
  (import.meta?.env?.VITE_API_BASE ?? "").replace(/\/$/, "") ||
  "https://signlearn.onrender.com";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info"); // "success" | "error" | "info"
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMsg("");
    setMsgType("info");
    setSending(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      const text = res?.data?.message || "Password reset link sent! Check your email.";
      setMsg(text);
      setMsgType("success");
    } catch (error) {
      const detail =
        error?.response?.data?.detail ??
        error?.response?.data?.message ??
        error?.message ??
        "An error occurred. Please try again.";
      console.log("[forgot-password] error:", error?.response || error);
      setMsg(detail);
      setMsgType("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Container>
      <Card>
        <Title>Forgot Password</Title>
        <Form onSubmit={handleForgotPassword}>
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send Reset Link"}
          </Button>
          {msg && <Message $type={msgType}>{msg}</Message>}
        </Form>
        <BackToLogin onClick={() => navigate("/")}>Back to Login</BackToLogin>
      </Card>
    </Container>
  );
};

export default ForgotPassword;

// ---- styles ----
const Container = styled.div`
  display: flex; justify-content: center; align-items: center;
  height: 100vh; background: linear-gradient(135deg, #e6dfff, #d6e6ff); padding: 20px;
`;
const Card = styled.div`
  background: #ffffff; padding: 40px; border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%;
`;
const Title = styled.h2`
  font-size: 1.8rem; margin-bottom: 20px; color: #4a316f; font-weight: bold;
`;
const Form = styled.form` display: flex; flex-direction: column; `;
const Input = styled.input`
  padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
  &:focus { border-color: #4a316f; outline: none; box-shadow: 0 0 4px rgba(74,49,111,0.5); }
`;
const Button = styled.button`
  padding: 10px 15px; background-color: #4a316f; color: #fff; border: none; border-radius: 8px; font-size: 1rem;
  cursor: pointer; margin-top: 10px;
  &:hover { background-color: #3a2559; }
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;
const Message = styled.p`
  margin-top: 10px;
  color: ${({ $type }) => ($type === "success" ? "green" : $type === "error" ? "crimson" : "#333")};
  font-size: 0.95rem;
`;
const BackToLogin = styled.div`
  margin-top: 20px; color: #4a316f; cursor: pointer; font-size: 0.9rem;
  &:hover { text-decoration: underline; }
`;
