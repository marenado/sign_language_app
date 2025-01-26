import React, { useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/auth/signup", {
        email,
        username,
        password,
      });

      // Show success message
      setMessage(
        "Account created successfully! Please check your email for the verification link."
      );
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setMessage(error.response.data.detail); // Use the detailed backend error
      } else {
        setMessage("An error occurred. Please try again.");
      }
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
        <Button type="submit">Sign Up</Button>
        {message && <Message>{message}</Message>}
      </Form>
    </Container>
  );
};

export default SignUp;

// Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #1e133f;
`;

const Form = styled.form`
  background-color: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;

  h2 {
    margin-bottom: 1rem;
    color: #4a316f;
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

const Message = styled.p`
  margin-top: 10px;
  color: ${(props) => (props.success ? "green" : "red")};
`;
