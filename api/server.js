const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/analyze-star", async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a playful astrophysicist who gives personality horoscopes based on the shape of simulated star images."
        },
        {
          role: "user",
          content: `This is a base64-encoded PNG image of a star shape generated in a simulation:\n\n${image}\n\nWhat type of star does this resemble, and what personality traits or horoscope would you associate with it? Be creative and fun.`
        }
      ]
    });

    const reply = chat.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ API server listening on http://localhost:${port}`));