export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resume, jobDescription } = req.body || {};

    if (!resume || !jobDescription) {
      return res.status(400).json({
        error: "Resume and job description are required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    const prompt = `
You are an expert ATS resume reviewer and career coach.

Analyze the resume against the job description.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON with these exact fields:
{
  "atsScore": 0,
  "summary": "Short summary",
  "matchingKeywords": ["keyword"],
  "missingKeywords": ["keyword"],
  "strengths": ["strength"],
  "improvementSuggestions": ["suggestion"],
  "skillGapPlan": ["learning step"],
  "interviewQuestions": ["question"],
  "suggestedRoles": ["role"]
}

Rules:
- atsScore must be a number from 0 to 100.
- Do not invent qualifications or experience.
- Give practical suggestions suitable for a fresher when applicable.
- Keep every list useful and specific.
- Return JSON only.
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(502).json({
        error: result.error?.message || "Gemini API request failed."
      });
    }

    const output = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!output) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    const report = JSON.parse(output);
    return res.status(200).json(report);

  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({
      error: "Unable to analyze the resume. Please try again."
    });
  }
}