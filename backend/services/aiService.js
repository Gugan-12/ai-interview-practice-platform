require("dotenv").config();

const fetch = require("node-fetch");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callAI(messages) {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: messages,
        temperature: 0.5,
        max_tokens: 300
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq Response:", data);
      throw new Error("Groq API error");
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error("AI Service Error:", error.message);
    throw error;
  }
}

module.exports = { callAI };