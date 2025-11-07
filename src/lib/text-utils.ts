import React from "react";

/**
 * Parses text and returns a JSX element with bold styling if the text is wrapped in **
 * @param text - The text to parse
 * @returns JSX element with appropriate styling
 */
export function parseBoldText(text: string): React.ReactElement | string {
  const trimmedText = text.trim();

  // Check if text starts with ** and ends with **
  if (
    trimmedText.startsWith("**") &&
    trimmedText.endsWith("**") &&
    trimmedText.length > 4
  ) {
    const boldContent = trimmedText.substring(2, trimmedText.length - 2);
    return React.createElement(
      "b",
      { className: "text-gray-600 dark:text-gray-100 font-semibold" },
      boldContent
    );
  }

  return trimmedText;
}

/**
 * Parses the first line of text and returns appropriate JSX
 * @param text - The text to parse (can be multiline)
 * @param fallback - Fallback text if the input is empty
 * @returns JSX element with appropriate styling
 */
export function parseFirstLine(
  text: string,
  fallback: string = "Analyzing information..."
): React.ReactElement | string {
  const firstLine = text.split("\n")[0] || fallback;
  return parseBoldText(firstLine);
}
