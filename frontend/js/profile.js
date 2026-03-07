const API_URL = "http://localhost:5000/api/profile";
const token = localStorage.getItem("token");

/* ======================
   LOAD PROFILE ON PAGE LOAD
====================== */
window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) return;

  try {
    const res = await fetch("http://localhost:5000/api/profile", {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();

    if (!data) {
      enableEdit();
      return;
    }

    // ===== FILL VIEW MODE =====
    document.getElementById("view-name").innerText = data.full_name || "";
    document.getElementById("view-role").innerText = data.role || "";
    document.getElementById("view-experience").innerText = data.experience || "";

    const viewSkills = document.getElementById("view-skills");
    viewSkills.innerHTML = "";

    if (data.skills && data.skills.length > 0) {
      data.skills.forEach(skill => {
        const tag = document.createElement("span");
        tag.className = "skill-tag";
        tag.innerText = skill;
        viewSkills.appendChild(tag);
      });
    }

    // ===== FILL EDIT FORM =====
    document.getElementById("fullName").value = data.full_name || "";
    document.getElementById("role").value = data.role || "";
    document.getElementById("experience").value = data.experience || "";

  } catch (error) {
    console.error("Error loading profile:", error);
  }
});

/* ======================
   SAVE PROFILE
====================== */
async function saveProfile() {
  const full_name = document.getElementById("fullName").value;
  const role = document.getElementById("role").value;
  const experience = document.getElementById("experience").value;

  const skillElements = document.querySelectorAll(".skill-tag span:first-child");
  const skills = Array.from(skillElements).map(el => el.innerText);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        full_name,
        role,
        experience,
        skills
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    alert("Profile updated successfully!");
    location.reload();

  } catch (err) {
    console.error(err);
  }
}


/* ======================
   ADD SKILL
====================== */
function addSkill() {
  const input = document.getElementById("skill-input");
  const skill = input.value.trim();

  if (!skill) return;

  addSkillToUI(skill);
  input.value = "";
}

function addSkillToUI(skill) {
  const container = document.getElementById("skills-container");

  const tag = document.createElement("div");
  tag.className = "skill-tag";

  tag.innerHTML = `
    <span>${skill}</span>
    <span onclick="this.parentElement.remove()" style="cursor:pointer;margin-left:8px;">×</span>
  `;

  container.appendChild(tag);
}


function enableEdit() {
  document.getElementById("profile-view").style.display = "none";
  document.getElementById("profile-edit").style.display = "block";
}

function cancelEdit() {
  document.getElementById("profile-edit").style.display = "none";
  document.getElementById("profile-view").style.display = "block";
}


/* ======================
   Avatar
====================== */

document.getElementById("profile-avatar").innerText =
  data.full_name ? data.full_name.charAt(0).toUpperCase() : "";
