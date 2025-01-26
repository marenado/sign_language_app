import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

const EmailVerified = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Card>
        <IconWrapper>
          <CheckCircle size={48} />
        </IconWrapper>
        <Title>Email Verified Successfully!</Title>
        <Subtitle>Your email has been verified.</Subtitle>
        <Button onClick={() => navigate("/")}>Click here to log in</Button>
      </Card>
    </Container>
  );
};

export default EmailVerified;

// Styled Components
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
`;

const Card = styled.div`
  text-align: center;
  background: #fff;
  color: #4a316f;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  animation: fadeIn 0.5s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const IconWrapper = styled.div`
  color: #4caf50;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: #4a316f;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  margin-bottom: 1.5rem;
  color: #666;
`;

const Button = styled.button`
  padding: 10px 20px;
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
