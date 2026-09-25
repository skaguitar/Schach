import { mountLessons } from "./lessons.js";
import { mountSparring } from "./sparring.js";
import { mountCoach } from "./coach.js";

const tabButtons = document.querySelectorAll(".tab-btn");
const tabViews = {
  home: document.getElementById("tab-home"),
  lessons: document.getElementById("tab-lessons"),
  sparring: document.getElementById("tab-sparring"),
  coach: document.getElementById("tab-coach"),
};

function activateTab(name) {
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === name));
  Object.entries(tabViews).forEach(([key, el]) => el.classList.toggle("active", key === name));
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

document.querySelector(".go-lessons").addEventListener("click", () => activateTab("lessons"));
document.querySelector(".go-sparring").addEventListener("click", () => activateTab("sparring"));
document.querySelector(".go-coach").addEventListener("click", () => activateTab("coach"));

mountLessons(tabViews.lessons);
mountSparring(tabViews.sparring);
mountCoach(tabViews.coach);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("../service-worker.js", import.meta.url)).catch((err) => {
      console.error("Service Worker konnte nicht registriert werden:", err);
    });
  });
}
