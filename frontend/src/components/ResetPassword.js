import React, { useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import styled from "styled-components";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const token = searchParams.get("token");
    try {
      await axios.post("http://127.0.0.1:8000/auth/reset-password", {
        token,
        new_password: password,
      });
      setMessage("Password reset successfully! You can now log in.");
      setSuccess(true); // Indicate success for styling
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "An error occurred. Please try again.";
      setMessage(errorMessage);
      setSuccess(false);
    }
  };

  return (
    <Container>
      <Form onSubmit={handleResetPassword}>
        <h2>Reset Your Password</h2>
        <p>Enter a new password to regain access to your account.</p>
        <Input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit">Reset Password</Button>
        {message && (
          <Message success={success}>
            {message}
          </Message>
        )}
        {success && (
          <RedirectButton onClick={() => navigate("/")}>
            Go to Login Page
          </RedirectButton>
        )}
      </Form>
    </Container>
  );
};

export default ResetPassword;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(145deg, #f3f4f6, #e4e5e9);
`;

const Form = styled.form`
  background: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  text-align: center;

  h2 {
    margin-bottom: 10px;
    color: #4a316f;
  }

  p {
    margin-bottom: 20px;
    color: #666666;
    font-size: 14px;
  }
`;

const Input = styled.input`
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 14px;
`;

const Button = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #4a316f;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: #3a2559;
  }
`;

const Message = styled.p`
  color: ${(props) => (props.success ? "green" : "red")};
  font-size: 14px;
  margin-top: 15px;
`;

const RedirectButton = styled.button`
  margin-top: 15px;
  background-color: transparent;
  color: #4a316f;
  border: 1px solid #4a316f;
  border-radius: 5px;
  padding: 10px;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: #4a316f;
    color: white;
  }
`;
