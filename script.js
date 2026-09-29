const form = document.getElementById("plan-form");
const statusBox = document.getElementById("status");
const resultCard = document.getElementById("result-card");
const resultBox = document.getElementById("result");
const button = document.getElementById("submit-btn");
const downloadBtn = document.getElementById("download-btn");
const saveBtn = document.getElementById("save-btn");
const historyList = document.getElementById("history-list");
const themeToggle = document.getElementById("theme-toggle");

let currentPlanText = "";

function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

const savedTheme = localStorage.getItem("fitbuddy_theme") || "light";
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(newTheme);
    localStorage.setItem("fitbuddy_theme", newTheme);
});

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
        age: document.getElementById("age").value,
        gender: document.getElementById("gender").value,
        height: document.getElementById("height").value,
        weight: document.getElementById("weight").value,
        goal: document.getElementById("goal").value,
        activity_level: document.getElementById("activity_level").value,
        workout_days: document.getElementById("workout_days").value,
        diet: document.getElementById("diet").value,
        conditions: document.getElementById("conditions").value
    };

    statusBox.innerHTML = '<span class="spinner"></span> Generating your plan...';
    resultCard.classList.add("hidden");
    button.disabled = true;

    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            statusBox.textContent = "Error: " + (data.error || "Something went wrong");
        } else {
            statusBox.textContent = "";
            currentPlanText = data.plan;
            resultBox.innerHTML = formatPlan(data.plan);
            resultCard.classList.remove("hidden");
        }
    } catch (err) {
        statusBox.textContent = "Could not reach the server. Is app.py running?";
    } finally {
        button.disabled = false;
    }
});

function formatPlan(text) {
    return text
        .split("\n")
        .map(line => {
            if (line.startsWith("## ")) {
                return `<h3>${line.replace("## ", "")}</h3>`;
            }
            if (line.trim() === "") return "<br>";
            return `<p>${line}</p>`;
        })
        .join("");
}

downloadBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(currentPlanText, 180);
    doc.setFontSize(16);
    doc.text("FitBuddy - My Fitness Plan", 10, 15);
    doc.setFontSize(11);
    doc.text(lines, 10, 25);
    doc.save("fitbuddy-plan.pdf");
});

function loadHistory() {
    const items = JSON.parse(localStorage.getItem("fitbuddy_history") || "[]");
    historyList.innerHTML = "";
    if (items.length === 0) {
        historyList.innerHTML = "<p class='muted'>No saved plans yet.</p>";
        return;
    }
    items.slice().reverse().forEach((item) => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.innerHTML = `<strong>${item.date}</strong> - ${item.goal}
            <button class="view-btn">View</button>`;
        div.querySelector(".view-btn").addEventListener("click", () => {
            currentPlanText = item.plan;
            resultBox.innerHTML = formatPlan(item.plan);
            resultCard.classList.remove("hidden");
            window.scrollTo({ top: resultCard.offsetTop - 20, behavior: "smooth" });
        });
        historyList.appendChild(div);
    });
}

saveBtn.addEventListener("click", () => {
    const items = JSON.parse(localStorage.getItem("fitbuddy_history") || "[]");
    items.push({
        date: new Date().toLocaleString(),
        goal: document.getElementById("goal").value,
        plan: currentPlanText
    });
    while (items.length > 10) items.shift();
    localStorage.setItem("fitbuddy_history", JSON.stringify(items));
    loadHistory();
    saveBtn.textContent = "Saved!";
    setTimeout(() => (saveBtn.textContent = "Save to History"), 1500);
});

loadHistory();