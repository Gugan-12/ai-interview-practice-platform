const API_BASE = "http://localhost:5000/api/interview";
const token = localStorage.getItem("token");

let userName = "";
let interviewId = null;
let currentQuestion = 1;
let previousAnswer = "";
let lastQuestion = ""; // store actual question text
let roleSelected = "";
let typeSelected = "";
let timerInterval;
let timeLeft;

/* ================= LOAD USER ================= */

async function loadUserProfile() {
  try {
    const res = await fetch("http://localhost:5000/api/profile", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      console.error("Profile fetch failed");
      return false;
    }

    const data = await res.json();
    userName = data.full_name || "";
    console.log("Loaded user:", userName);
    return true;

  } catch (err) {
    console.error("Profile load error:", err);
    return false;
  }
}

window.addEventListener("DOMContentLoaded", loadUserProfile);

/* ================= START INTERVIEW ================= */

async function startInterview() {

  roleSelected = document.getElementById("roleSelect").value;
  typeSelected = document.getElementById("typeSelect").value;
  const duration = parseInt(document.getElementById("durationSelect").value);

  if (!userName) {
    const loaded = await loadUserProfile();
    if (!loaded || !userName) {
      alert("Unable to load user profile. Please login again.");
      return;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      }
    });

    const data = await res.json();
    interviewId = data.id;

  } catch (err) {
    console.error("Create interview error:", err);
    alert("Failed to create interview");
    return;
  }

  document.getElementById("setupScreen").style.display = "none";
  document.getElementById("chatWrapper").style.display = "flex";

  document.getElementById("chatTitle").innerText =
    roleSelected + " | " + typeSelected;

  currentQuestion = 1;
  previousAnswer = "";
  lastQuestion = "";

  startTimer(duration);
  generateNextQuestion();
}

/* ================= TIMER ================= */

function startTimer(minutes) {

  timeLeft = minutes * 60;

  timerInterval = setInterval(() => {

    timeLeft--;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    document.getElementById("timer").innerText =
      mins + ":" + (secs < 10 ? "0" : "") + secs;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      completeInterview();
    }

  }, 1000);
}

/* ================= GENERATE QUESTION ================= */

async function generateNextQuestion() {

  showLoader(true);

  try {

    const res = await fetch(`${API_BASE}/next-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        role: roleSelected,
        type: typeSelected,
        previous_answer: previousAnswer,
        previous_question: lastQuestion,
        question_number: currentQuestion,
        user_name: userName,
        interview_id: interviewId
    })
    });

    const data = await res.json();
    showLoader(false);

    if (!res.ok) {
      alert("Failed to fetch question");
      return;
    }

    if (data.endInterview) {
      completeInterview();
      return;
    }

    if (!data.question) {
      alert("No question received");
      return;
    }

    lastQuestion = data.question; // store the real question

    addMessage(data.question, "ai");
    speakQuestion(data.question);

  } catch (err) {

    showLoader(false);
    console.error("Question fetch error:", err);
    alert("Error generating question");

  }
}

/* ================= SUBMIT ANSWER ================= */

async function submitAnswer() {

  const answerInput = document.getElementById("answerBox");
  const answer = answerInput.value.trim();

  if (!answer) return;

  addMessage(answer, "user");

  previousAnswer = answer;
  answerInput.value = "";

  const lower = answer.toLowerCase();

  // END COMMAND
  if (
    lower.includes("end interview") ||
    lower.includes("stop interview") ||
    lower.includes("finish interview")
  ) {

    addMessage("Thank you for attending. Generating feedback now...", "ai");

    speakQuestion("Thank you for attending. Generating feedback now.");

    setTimeout(() => completeInterview(), 1500);

    return;
  }

  // SAVE ANSWER
  await fetch(`${API_BASE}/save-answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      interview_id: interviewId,
      question: lastQuestion, // store real question
      answer: answer
    })
  });

  currentQuestion++;

  generateNextQuestion();
}

/* ================= COMPLETE INTERVIEW ================= */

async function completeInterview() {

  clearInterval(timerInterval);

  try {

    const res = await fetch(`${API_BASE}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        interview_id: interviewId,
        role: roleSelected
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert("Failed to generate feedback");
      return;
    }

    localStorage.setItem("feedback", JSON.stringify(data.feedback));

    window.location.href = "feedback.html";

  } catch (err) {

    console.error("Complete interview error:", err);

    alert("Error generating feedback");

  }
}

/* ================= UI HELPERS ================= */

function addMessage(text, sender) {

  const conversation = document.getElementById("conversationArea");

  const div = document.createElement("div");

  div.classList.add("message");

  div.classList.add(sender === "ai" ? "ai-message" : "user-message");

  div.innerText = text;

  conversation.appendChild(div);

  conversation.scrollTop = conversation.scrollHeight;

}

function showLoader(show) {

  const loader = document.getElementById("loader");

  if (loader) loader.style.display = show ? "block" : "none";

}

function speakQuestion(text) {

  const synth = window.speechSynthesis;

  if (!synth) {
    console.log("Speech synthesis not supported");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  function speak() {
    const voices = synth.getVoices();

    if (voices.length > 0) {
      utterance.voice = voices[0];
      synth.cancel();
      synth.speak(utterance);
    }
  }

  if (synth.getVoices().length !== 0) {
    speak();
  } else {
    synth.onvoiceschanged = speak;
  }
}
/* ENTER KEY SUPPORT */

document.getElementById("answerBox").addEventListener("keydown", e => {

  if (e.key === "Enter" && !e.shiftKey) {

    e.preventDefault();

    submitAnswer();

  }

});

/* ================= VOICE INPUT ================= */

function startVoice() {
   debugger

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    alert("Speech recognition not supported in this browser.");

    return;

  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";

  recognition.interimResults = false;

  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = function (event) {

    const transcript = event.results[0][0].transcript;

    document.getElementById("answerBox").value = transcript;

  };

  recognition.onerror = function (event) {

    console.error("Voice recognition error:", event.error);

  };

}

/* ================= END BUTTON ================= */

document.addEventListener("DOMContentLoaded", () => {

  const endBtn = document.getElementById("endBtn");

  if (endBtn) {

    endBtn.addEventListener("click", async () => {

      addMessage("Thank you for attending. Generating feedback...", "ai");

      speakQuestion("Thank you for attending. Generating feedback now.");

      setTimeout(() => {

        completeInterview();

      }, 1500);

    });

  }

});