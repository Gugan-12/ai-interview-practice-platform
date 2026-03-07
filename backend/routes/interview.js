const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { callAI } = require("../services/aiService");

const router = express.Router();

/* =====================================================
   CREATE INTERVIEW
===================================================== */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "INSERT INTO interviews (user_id, started_at) VALUES ($1, NOW()) RETURNING *",
      [userId]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Create Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   SAVE ANSWER
===================================================== */
router.post("/save-answer", authMiddleware, async (req, res) => {
  try {
    const { interview_id, question, answer } = req.body;

    await pool.query(
      "INSERT INTO answers (interview_id, question, answer) VALUES ($1,$2,$3)",
      [interview_id, question, answer]
    );

    res.json({ message: "Answer saved" });

  } catch (err) {
    console.error("Save Answer Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   NEXT QUESTION
===================================================== */
router.post("/next-question", authMiddleware, async (req, res) => {

  try {

    const {
      role,
      type,
      previous_answer,
      question_number,
      user_name,
      interview_id
    } = req.body;

    if (!interview_id) {
      return res.status(400).json({ message: "Interview ID missing" });
    }

    const answer = (previous_answer || "").toLowerCase();

    /* ================= NEGATIVE WORD DETECTION ================= */

    const badWords = [
      "stupid",
      "idiot",
      "fool",
      "dumb",
      "useless",
      "shut up",
      "nonsense"
    ];

    if (badWords.some(w => answer.includes(w))) {
      return res.json({
        question:
          "Let's keep the conversation professional. Please try answering the interview question."
      });
    }

    /* ================= FRUSTRATION DETECTION ================= */

    const frustrationWords = [
      "i don't know",
      "dont know",
      "no idea",
      "not sure",
      "skip"
    ];

    if (frustrationWords.some(w => answer.includes(w))) {
      return res.json({
        question:
          "That's okay. Take a moment to think about the concept and explain what you know about it."
      });
    }

    /* ================= TOPIC DIVERSION DETECTION ================= */

    const diversionWords = [
      "joke",
      "your name",
      "how are you",
      "change topic",
      "different question"
    ];

    if (diversionWords.some(w => answer.includes(w))) {
      return res.json({
        question:
          "Let's stay focused on the interview. Please answer the current question."
      });
    }

    /* ================= HARD END DETECTION ================= */

    if (answer.includes("end interview")) {
      return res.json({ endInterview: true });
    }

    /* ================= GET PREVIOUS QUESTIONS ================= */

    const prevQ = await pool.query(
      "SELECT question FROM answers WHERE interview_id=$1",
      [interview_id]
    );

    const askedQuestions = prevQ.rows.map(r => r.question).join("\n");

    /* ================= AI PROMPT ================= */

    const messages = [

      {
        role: "system",
        content: `
You are a strict professional ${type} interviewer.

Rules:
- Ask ONLY ONE conceptual question
- Maximum ONE LINE
- No coding questions
- No DSA
- No explanations
- No markdown
- Do NOT repeat previous questions
- Focus ONLY on ${role}

If candidate shows frustration, encourage them politely.

Return ONLY the question text.
`
      },

      {
        role: "user",
        content: `
Candidate Name: ${user_name}
Question Number: ${question_number}

Previously Asked Questions:
${askedQuestions || "None"}

If question_number == 1:
Start with:
"Hi ${user_name}, welcome to your ${type} interview."
Then ask ONE conceptual question about ${role}.

Otherwise:
Ask ONE NEW conceptual question about ${role}
that is DIFFERENT from previous questions.
`
      }

    ];

    let question = await callAI(messages);

    if (!question) {
      return res.status(500).json({ message: "No question generated" });
    }

    /* ================= CLEAN RESPONSE ================= */

    question = question
      .replace(/```/g, "")
      .replace(/\*/g, "")
      .replace(/markdown/gi, "")
      .trim();

    question = question.split("\n")[0];

    if (question_number > 1) {
      question = question.replace(/^Hi.*?,\s*/i, "");
    }

    res.json({ question });

  } catch (err) {
    console.error("Next Question Error:", err);
    res.status(500).json({ message: "AI error" });
  }

});

/* =====================================================
   COMPLETE INTERVIEW + EVALUATION
===================================================== */

router.post("/complete", authMiddleware, async (req, res) => {

  try {

    const { interview_id, role } = req.body;

    if (!interview_id) {
      return res.status(400).json({ message: "Interview ID missing" });
    }

    const result = await pool.query(
      "SELECT question, answer FROM answers WHERE interview_id=$1",
      [interview_id]
    );

    const answers = result.rows;

    if (!answers.length) {
      return res.status(400).json({ message: "No answers found" });
    }

    const messages = [

      {
        role: "system",
        content: `
You are a strict interview evaluator.

Return ONLY valid JSON in this format:

{
 "technical_score": number,
 "communication_score": number,
 "confidence_score": number,
 "overall_score": number,
 "strengths": ["point1","point2"],
 "improvements": ["point1","point2"]
}

Rules:
- Scores must be between 1 and 10
- No markdown
- No explanation
Return JSON only.
`
      },

      {
        role: "user",
        content: `
Role: ${role}
Answers: ${JSON.stringify(answers)}

Evaluate performance now.
`
      }

    ];

    const feedbackRaw = await callAI(messages);

    if (!feedbackRaw) {
      return res.status(500).json({ message: "AI did not return feedback" });
    }

    const jsonStart = feedbackRaw.indexOf("{");
    const jsonEnd = feedbackRaw.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd === -1) {
      return res.status(500).json({ message: "Invalid AI response format" });
    }

    const cleanJson = feedbackRaw.substring(jsonStart, jsonEnd);

    let feedback;

    try {
      feedback = JSON.parse(cleanJson);
    } catch (err) {
      console.error("JSON Parse Error:", feedbackRaw);
      return res.status(500).json({ message: "Feedback parsing failed" });
    }

    feedback.technical_score = Math.round(Number(feedback.technical_score || 0));
    feedback.communication_score = Math.round(Number(feedback.communication_score || 0));
    feedback.confidence_score = Math.round(Number(feedback.confidence_score || 0));
    feedback.overall_score = Math.round(Number(feedback.overall_score || 0));

    await pool.query(
      "UPDATE interviews SET completed_at=NOW(), overall_score=$1 WHERE id=$2",
      [feedback.overall_score, interview_id]
    );

    await pool.query(
      `INSERT INTO feedback
      (interview_id, technical_score, communication_score, confidence_score, strengths, improvements)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        interview_id,
        feedback.technical_score,
        feedback.communication_score,
        feedback.confidence_score,
        JSON.stringify(feedback.strengths || []),
        JSON.stringify(feedback.improvements || [])
      ]
    );

    res.json({ feedback });

  } catch (err) {
    console.error("Complete Interview Error:", err);
    res.status(500).json({ message: "Evaluation error" });
  }

});

/* =====================================================
   HISTORY
===================================================== */

router.get("/history", authMiddleware, async (req, res) => {

  try {

    const userId = req.user.id;

    const history = await pool.query(
      `SELECT 
      ROW_NUMBER() OVER (ORDER BY started_at DESC) AS interview_no,
      id,
      started_at,
      overall_score
      FROM interviews
      WHERE user_id=$1
      ORDER BY started_at DESC`,
      [userId]
    );

    res.json(history.rows);

  } catch (err) {

    console.error("History Error:", err);

    res.status(500).json({ message: "Server error" });

  }

});
/* =====================================================
   GET INTERVIEW DETAILS
===================================================== */
router.get("/details/:id", authMiddleware, async (req, res) => {
  try {
    const interviewId = req.params.id;

    const answers = await pool.query(
      "SELECT question, answer FROM answers WHERE interview_id=$1",
      [interviewId]
    );

    const feedback = await pool.query(
      "SELECT * FROM feedback WHERE interview_id=$1",
      [interviewId]
    );

    res.json({
      answers: answers.rows,
      feedback: feedback.rows[0] || null
    });

  } catch (err) {
    console.error("Interview Details Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;