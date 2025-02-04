import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { Search as SearchIcon } from "@mui/icons-material"; // Material-UI Icon for the magnifying glass



const DictionaryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [alphabetFilter, setAlphabetFilter] = useState("");
  const [dictionaryItems, setDictionaryItems] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [languages, setLanguages] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      fetchDictionaryItems(selectedLanguage);
    }
  }, [selectedLanguage]);

  const fetchLanguages = async () => {
    try {
      const response = await api.get("/dictionary/languages");
      setLanguages(response.data);
      setSelectedLanguage(response.data[0]); // Default to the first language
    } catch (err) {
      // console.error("Failed to fetch languages:", err);
      setError("Failed to load languages.");
    }
  };

  const fetchDictionaryItems = async (language) => {
    try {
      setLoading(true);
      const response = await api.get(`/dictionary?language=${language}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
      });
      setDictionaryItems(response.data);
      setError("");
    } catch (err) {
      // console.error("Failed to fetch dictionary items:", err);
      setError("Failed to load dictionary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = dictionaryItems.filter((item) => {
    const matchesSearch = searchTerm
      ? item.gloss.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesAlphabet = alphabetFilter
      ? item.gloss.toLowerCase().startsWith(alphabetFilter.toLowerCase())
      : true;
    return matchesSearch && matchesAlphabet;
  });

  return (
    <PageContainer>
      <Sidebar />
      <Content>
      <Header>
  <TopControls>
    <LanguageSelector
      value={selectedLanguage}
      onChange={(e) => setSelectedLanguage(e.target.value)}
    >
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </LanguageSelector>
    <SearchBarContainer>
      <SearchBar
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <SearchIconWrapper>
        <SearchIcon style={{ color: "#888" }} />
      </SearchIconWrapper>
    </SearchBarContainer>
  </TopControls>
  <AlphabetFilter>
    {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((letter) => (
      <Letter
        key={letter}
        selected={alphabetFilter === letter}
        onClick={() =>
          setAlphabetFilter(letter === alphabetFilter ? "" : letter)
        }
      >
        {letter}
      </Letter>
    ))}
  </AlphabetFilter>
</Header>

{loading ? (
  <Message>Loading...</Message>
) : error ? (
  <Message>{error}</Message>
) : filteredItems.length === 0 ? (
  <Message>Sorry, no content available for the selected language.</Message>
) : (
  <ContentContainer>
    <DictionaryList>
      {filteredItems.map((item) => (
        <DictionaryItem
          key={item.gloss}
          onClick={() => setSelectedItem(item)}
          selected={selectedItem?.gloss === item.gloss}
        >
          {item.gloss}
        </DictionaryItem>
      ))}
    </DictionaryList>
    {selectedItem && (
      <VideoSection>
        <WordTitle>{selectedItem.gloss}</WordTitle>
        <VideoContainer>
          <Video key={selectedItem.video_url} controls autoPlay loop>
            <source src={selectedItem.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </Video>
        </VideoContainer>
      </VideoSection>
    )}
  </ContentContainer>
)}

      </Content>
    </PageContainer>
  );
};

export default DictionaryPage;

// Styled Components
const PageContainer = styled.div`
  display: flex;
  height: 100vh; /* Ensure it takes the full viewport height */
  width: 100vw; /* Ensure it takes the full viewport width */
  overflow: hidden; /* Disable scrolling for this container */
`;

const Content = styled.div`
  flex: 1;
  overflow: hidden; /* Disable scrolling in the content area */
  background-color: #f9f9f9;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column; /* Stack items vertically */
  align-items: center;
  margin-bottom: 2rem;
  margin-top: 1rem;
  gap: 1rem; /* Add space between sections (dropdown+search and alphabet) */
`;



const SearchBarContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 500px;
`;


const SearchBar = styled.input`
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 1rem; /* Add space for the icon */
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
`;
const SearchWrapper = styled.div`
  position: relative; /* Enable positioning for the icon */
  width: 100%;
  max-width: 500px;
  margin-top: 1rem;
`;

const TopControls = styled.div`
  display: flex;
  flex-direction: row; /* Align language selector and search bar horizontally */
  justify-content: center;
  align-items: center;
  gap: 1rem; /* Add space between dropdown and search bar */
`;



const AlphabetFilter = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.01rem; /* Add some spacing between letters */
`;

const Letter = styled.button`
  background-color: ${(props) => (props.selected ? "#6c63ff" : "#e0e0e0")};
  color: ${(props) => (props.selected ? "#fff" : "#333")};
  border: none;
  padding: 0.5rem;
  margin: 0.2rem;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => (props.selected ? "#4a47d6" : "#d6d6d6")};
  }
`;

const ContentContainer = styled.div`
  display: flex;
  gap: 2rem;
`;

const DictionaryList = styled.div`
  flex: 1;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem;
`;

const DictionaryItem = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 5px;
  background-color: ${(props) => (props.selected ? "#6c63ff" : "#f9f9f9")};
  color: ${(props) => (props.selected ? "#fff" : "#333")};
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props) => (props.selected ? "#4a47d6" : "#e0e0e0")};
  }
`;

const VideoSection = styled.div`
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const WordTitle = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #333;
`;


const VideoContainer = styled.div`
  max-width: 500px; /* Fixed max width */
  width: 100%; /* Ensure responsiveness */
  aspect-ratio: 16 / 9; /* Maintain standard video aspect ratio */
  margin: 0 auto;
  background-color: #000; /* Add background for contrast */
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Video = styled.video`
  width: 100%; /* Fill the container */
  height: 100%; /* Fill the container */
  object-fit: contain; /* Ensure proper scaling without cropping */
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const Message = styled.div`
  text-align: center;
  font-size: 1.2rem;
  color: #666;
`;

const LanguageSelector = styled.select`
  padding: 0.5rem;
  font-size: 1rem;
  border-radius: 5px;
  border: 1px solid #ccc;
  max-width: 200px; /* Optional to limit width */
`;