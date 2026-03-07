const API_URL = "http://localhost:5000/api/auth";

/* ======================
   TOGGLE LOGIN / SIGNUP
====================== */

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const toggleLink = document.getElementById("toggle-link");
const formTitle = document.getElementById("form-title");

toggleLink.addEventListener("click", () => {
  loginForm.classList.toggle("hidden");
  signupForm.classList.toggle("hidden");

  if (loginForm.classList.contains("hidden")) {
    formTitle.innerText = "Sign Up";
    toggleLink.innerText = "Already have an account? Login";
  } else {
    formTitle.innerText = "Login";
    toggleLink.innerText = "Don't have an account? Sign Up";
  }
});


/* ======================
   SIGNUP
====================== */

signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;
  const errorBox = document.getElementById("signup-error");

  errorBox.innerText = "";

  if (password !== confirm) {
    errorBox.innerText = "Passwords do not match";
    return;
  }

  const button = signupForm.querySelector("button");
  button.innerText = "Signing up...";
  button.disabled = true;

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    errorBox.style.color = "green";
    errorBox.innerText = "Signup successful! Please login.";

    signupForm.reset();

    setTimeout(() => {
      loginForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
      formTitle.innerText = "Login";
      toggleLink.innerText = "Don't have an account? Sign Up";
      errorBox.innerText = "";
      errorBox.style.color = "#dc2626";
    }, 1500);

  } catch (err) {
    errorBox.innerText = err.message;
  } finally {
    button.innerText = "Sign Up";
    button.disabled = false;
  }
});


/* ======================
   LOGIN
====================== */

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorBox = document.getElementById("login-error");

  errorBox.innerText = "";

  const button = loginForm.querySelector("button");
  button.innerText = "Logging in...";
  button.disabled = true;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    localStorage.setItem("token", data.token);

    window.location.href = "index.html";

  } catch (err) {
    errorBox.innerText = err.message;
  } finally {
    button.innerText = "Login";
    button.disabled = false;
  }
});
