import React, { useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(true);

  const navigate = useNavigate();

  const validateEmail = (email) => {
    // Regex to validate email format
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleEmailValidation = async (email) => {
    try {
      const response = await axios.post("https://signlearn.onrender.com/auth/validate-email", { email });
      console.log(response.data); // Debugging: Check the response format in the console
  
      if (response.data.valid) {
        setIsEmailValid(true);
        setMessage(""); // Clear the error message
      } else {
        setIsEmailValid(false);
        setMessage(response.data.reason || "Invalid email address.");
      }
    } catch (error) {
      console.error("Error validating email:", error);
      setIsEmailValid(false);
      setMessage("Error validating email. Please try again.");
    }
  };
  
  
  const handleEmailChange = async (e) => {
    const value = e.target.value;
    setEmail(value);
  
    if (validateEmail(value)) {
      await handleEmailValidation(value); // Call the external validation
    } else {
      setIsEmailValid(false);
      setMessage("Invalid email format."); // Local validation failure
    }
  };
  
  
  
  
  const handleSignUp = async (e) => {
    e.preventDefault();
  
    if (!isEmailValid) {
      setMessage("Please enter a valid email address.");
      return;
    }
  
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
  
      setMessage("Account created successfully! The verification link was sent to your email address. Please verify it.");
      // setTimeout(() => {
      //   navigate("/");
      // }, 3000);
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
          onChange={handleEmailChange}
          required
        />
        {!isEmailValid && <ErrorMessage>Invalid email format.</ErrorMessage>}
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
        <Button type="submit">Sign Up</Button>
        {message && <Message>{message}</Message>}
      </Form>
    </Container>
  );
};

export default SignUp;



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

const PasswordWrapper = styled.div`
  position: relative;
`;

const Requirements = styled.p`
  font-size: 0.8rem;
  color: #666;
  text-align: left;
  margin: 5px 0;
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
// Styled Components remain unchanged, except for ErrorMessage
const ErrorMessage = styled.p`
  color: red;
  font-size: 0.9rem;
  margin: 5px 0;
`;

const Message = styled.p`
  margin-top: 10px;
  color: ${(props) => (props.success ? "green" : "red")};
`;
