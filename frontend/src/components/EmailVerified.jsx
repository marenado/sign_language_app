import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';


const EmailVerified = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    console.log('EmailVerified mounted', API_BASE, window.location.search);
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('invalid');
      return;
    }

    fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          setStatus(data.status || (res.ok ? 'verified' : 'error'));
          return;
        }
        const html = (await res.text()).toLowerCase();
        if (html.includes('already verified')) setStatus('already');
        else if (html.includes('expired')) setStatus('expired');
        else if (html.includes('invalid')) setStatus('invalid');
        else if (res.ok) setStatus('verified');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, []);

  const view = VIEWS[status] || VIEWS.error;

  return (
    <Container>
      <Card>
        <IconWrapper>{view.icon}</IconWrapper>
        <Title>{view.title}</Title>
        {view.subtitle && <Subtitle>{view.subtitle}</Subtitle>}
        <Button onClick={() => navigate('/')}>{view.cta}</Button>
      </Card>
    </Container>
  );
};

const VIEWS = {
  loading: {
    title: 'Verifying your email…',
    subtitle: '',
    cta: 'Back to login',
    icon: <CheckCircle size={48} />,
  },
  verified: {
    title: 'Email Verified Successfully!',
    subtitle: 'Your email has been verified.',
    cta: 'Click here to log in',
    icon: <CheckCircle size={48} />,
  },
  already: {
    title: 'Email Already Verified',
    subtitle: 'You can sign in now.',
    cta: 'Go to login',
    icon: <CheckCircle size={48} />,
  },
  expired: {
    title: 'Verification Link Expired',
    subtitle: 'Please request a new link.',
    cta: 'Go to login',
    icon: <CheckCircle size={48} />,
  },
  invalid: {
    title: 'Invalid Verification Link',
    subtitle: 'Please request a new link.',
    cta: 'Go to login',
    icon: <CheckCircle size={48} />,
  },
  error: {
    title: 'Something went wrong',
    subtitle: 'Please try again later.',
    cta: 'Go to login',
    icon: <CheckCircle size={48} />,
  },
};

export default EmailVerified;

// styles (unchanged)
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
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
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
  background: #4a316f;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  &:hover {
    background: #3a2559;
  }
`;
