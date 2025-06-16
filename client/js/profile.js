document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("userId");

  if (!userId) return alert("Not logged in");

  document.getElementById("username").textContent = userId;
  document.getElementById("uid").textContent = userId;
});

function logout() {
  localStorage.removeItem("userId");
  window.location.href = "login.html";
}
