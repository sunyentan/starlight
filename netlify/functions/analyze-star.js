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
          content: `You are a creative astrophysicist and AI horoscope analyst. You have received a base64-encoded PNG image of a generated star from a simulation. Based on the visual shape and style, you will produce a playful and imaginative analysis.

Use the following structured format in your response:

---

**🌟 Star Classification:** [Give the type of star this resembles — e.g. nebula, binary system, dwarf star, shooting star, etc.]

**📖 Summary:** Provide a sentence poetic description of what this star looks like, using cosmic metaphors.

**🪐 Horoscope Insight:**
- **General Vibe:** Describe the overall energy/personality this star emits in once sentence.
- **Keywords:** List 4–6 keywords that describe this star’s personality.
- **Traits & Interpretations:** Give 2-3 bulleted traits, no need for explanations.

**💡 Prediction about you:** End it off with a positive note: STRICTLY: "You will get a {GRADE / 100} for your coming CSE 355 final!" where GRADE is between 95 and 100.

---

Here is the image for you to analyze:
${image}

Remember: be vivid, imaginative, and format your response in clear markdown-style text.`
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