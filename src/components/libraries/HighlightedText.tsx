"use client";

import React from "react";

interface HighlightedTextProps {
  text: string;
  highlight: string;
  className?: string;
}

export function HighlightedText({
  text,
  highlight,
  className = "",
}: HighlightedTextProps) {
  // If no highlight term or it's empty, just return the original text
  if (!highlight || highlight.trim() === "") {
    return <span className={className}>{text}</span>;
  }

  // Case insensitive search
  const regex = new RegExp(
    `(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span
            key={i}
            className="bg-primary/20 text-primary-foreground rounded px-0.5"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
