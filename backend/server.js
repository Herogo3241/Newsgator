// server.js (Node.js backend)
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config(); // ← FIXED: This needs to be invoked with ()

const app = express();
app.use(cors());
app.use(express.json()); // Allow JSON body parsing for POST requests

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Utility to strip HTML
function stripHtmlTags(html) {
  return html
    .replace(/<[^>]*>?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Utility to scrape article content
async function scrapeArticle(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const paragraphs = [];
  $("#maincontent .article-body-viewer-selector .dcr-16w5gq9").each((i, el) => {
    paragraphs.push($(el).text());
  });

  let cleanedContent = "";

  content = paragraphs.join("\n\n");
  cleanedContent = cleanArticle(content);
  console.log(cleanedContent);
  return cleanedContent;
}

// Function to summarize text using Gemini
async function summarizeArticle(text) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-001",
    contents: `Please summarize the following article in less than 600 words:\n\n${stripHtmlTags(
      text
    )}`
  });

  const summary = response.text;
  return summary;
}

async function cleanArticle(text) {
  // Phase 1: Clean unwanted data
  const cleanResponse = await ai.models.generateContent({
    model: "gemini-2.0-flash-001",
    contents: `
  You are a text cleaner. Do not summarize, rewrite, rephrase, or reduce the article in any way.
  
  Your task is to remove:
  - Ads and promotional content
  - Tracking or affiliate links
  - Symbols such as: *, #, ~, etc.
  - Make sure the returned content doesn't include markdown symbols
  - Redundant headers like "More on this topic", "You might also like", etc.
  
  Keep all actual article text exactly as it is. Do not change grammar, spelling, or structure.
  
  Return only the cleaned full article text.
  
  Here is the article to clean:
  """ 
  ${stripHtmlTags(text)}
  """
  `
  });

  const cleanedText = cleanResponse.text;

  // Phase 2: Summarize the cleaned content
  const summaryResponse = await ai.models.generateContent({
    model: "gemini-2.0-flash-001",
    contents: `
      Summarize the following article in less than 400 words, in the tone and structure of a professional news report.
  
      Focus on:
      - What happened
      - Who is involved
      - When and where it happened
      - Why it matters
      - How it unfolded
  
      Be clear, concise, and objective—like a real journalist writing for a major publication.
  
      Article content:
      ${cleanedText}
    `
  });

  return summaryResponse.text;
}

// Main endpoint: scrape + summarize
app.get("/api/summarize", async (req, res) => {
  const { url } = req.query;
  if (!url)
    return res.status(400).json({ error: "Missing 'url' in request body" });

  try {
    const articleText = await scrapeArticle(url);
    const summary = await summarizeArticle(articleText);
    res.json({ summary });
  } catch (err) {
    console.error("Error summarizing:", err);
    res.status(500).json({ error: "Failed to fetch or summarize article" });
  }
});

// Just scrape (optional endpoint)
app.get("/scrape", async (req, res) => {
  const { url } = req.query;
  try {
    const content = await scrapeArticle(url);

    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch content" });
  }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Scraper running on http://localhost:3001");
});
