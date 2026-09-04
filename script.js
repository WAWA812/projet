const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const formatBtn = document.getElementById("toggle-format");
const secondsBtn = document.getElementById("toggle-seconds");

let is24Hour = true;
let showSeconds = true;

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  let suffix = "";
  if (!is24Hour) {
    suffix = hours >= 12 ? " PM" : " AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }

  const parts = [pad(hours), minutes];
  if (showSeconds) parts.push(seconds);

  timeEl.textContent = parts.join(":") + suffix;
  dateEl.textContent = dateFormatter.format(now);
}

formatBtn.addEventListener("click", () => {
  is24Hour = !is24Hour;
  formatBtn.textContent = is24Hour ? "Format 12h" : "Format 24h";
  updateClock();
});

secondsBtn.addEventListener("click", () => {
  showSeconds = !showSeconds;
  secondsBtn.textContent = showSeconds ? "Masquer secondes" : "Afficher secondes";
  updateClock();
});

updateClock();
setInterval(updateClock, 1000);
