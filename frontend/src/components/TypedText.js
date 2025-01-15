import React, { useState, useEffect } from "react";

const TypedText = ({ text, speed }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [index, text, speed]);

  return (
    <div
      style={{
        height: "6em",
        lineHeight: "1.5em",
        overflow: "hidden", 
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start", 
      }}
    >
      <span style={{ whiteSpace: "pre-wrap" }}>{displayedText}</span>
    </div>
  );
};

export default TypedText;
