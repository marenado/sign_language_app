import React, { useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import styled from "styled-components";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
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
      setError(false);
    } catch (err) {
      setMessage(err.response?.data?.detail || "An error occurred while processing your request.");
      setError(true);
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
          <Message isError={error}>
            {message}
            {error && (
              <BackToLogin onClick={() => navigate("/")}>
                Go Back to Login
              </BackToLogin>
            )}
          </Message>
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
  background-color: #f8f9fa;
`;

const Form = styled.form`
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  text-align: center;

  h2 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    color: #4a316f;
  }

  p {
    font-size: 0.9rem;
    color: #6c757d;
    margin-bottom: 20px;
  }
`;

const Input = styled.input`
  display: block;
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
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

const Message = styled.p`
  color: ${(props) => (props.isError ? "red" : "green")};
  margin-top: 10px;
  font-size: 0.9rem;
`;

const BackToLogin = styled.span`
  display: block;
  margin-top: 10px;
  color: #4a316f;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: #3a2559;
  }
`;
