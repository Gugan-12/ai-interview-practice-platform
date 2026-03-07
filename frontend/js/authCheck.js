let token = localStorage.getItem("token");

if (!token) {
  window.location.href = "auth.html";
}
