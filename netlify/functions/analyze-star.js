const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function(event, context) {
  const body = JSON.parse(event.body || "{}");
  const { image } = body;

  if (!image) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No image provided" })
    };
  }

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a playful astrophysicist who gives personality horoscopes based on star images."
        },
        {
          role: "user",
          content: `This is a base64-encoded PNG image of a star shape generated in a simulation:\n\n${image}\n\nWhat type of star does this resemble, and what personality traits or horoscope would you associate with it? Be creative and fun.`
        }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: chat.choices[0].message.content })
    };
  } catch (err) {
    console.error("OpenAI error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OpenAI request failed" })
    };
  }
};