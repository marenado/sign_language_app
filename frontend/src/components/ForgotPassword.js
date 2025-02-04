import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      // console.log("Sending email:", email); // Add this line for debugging
      await axios.post("https://signlearn.onrender.com/auth/forgot-password", { email });
      setMessage("Password reset link sent! Check your email.");
    } catch (error) {
      const errorResponse = error.response?.data?.detail;
      if (Array.isArray(errorResponse)) {
        const errorMessage = errorResponse.map((err) => err.msg).join(", ");
        setMessage(errorMessage);
      } else if (typeof errorResponse === "string") {
        setMessage(errorResponse);
      } else {
        setMessage("An error occurred. Please try again.");
      }
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
          <Button type="submit">Send Reset Link</Button>
          {message && <Message>{message}</Message>}
        </Form>
        <BackToLogin onClick={() => navigate("/")}>Back to Login</BackToLogin>
      </Card>
    </Container>
  );
};

export default ForgotPassword;

// Styled components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #e6dfff, #d6e6ff);
  padding: 20px;
`;

const Card = styled.div`
  background: #ffffff;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 400px;
  width: 100%;
`;

const Title = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #4a316f;
  font-weight: bold;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const Input = styled.input`
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);

  &:focus {
    border-color: #4a316f;
    outline: none;
    box-shadow: 0 0 4px rgba(74, 49, 111, 0.5);
  }
`;

const Button = styled.button`
  padding: 10px 15px;
  background-color: #4a316f;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 10px;

  &:hover {
    background-color: #3a2559;
  }
`;

const Message = styled.p`
  margin-top: 10px;
  color: green;
  font-size: 0.9rem;
`;

const BackToLogin = styled.div`
  margin-top: 20px;
  color: #4a316f;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    text-decoration: underline;
  }
`;
