import { fetchWeek } from "./diet.js";

const els = {
  day: document.getElementById("day"),
  date: document.getElementById("date"),
  menu: document.getElementById("menu"),
  status: document.getElementById("status"),
  prev: document.getElementById("prevBtn"),
  next: document.getElementById("nextBtn"),
};

const state = { week: null, dayIndex: -1 };

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function render() {
  const day = state.dayIndex >= 0 ? state.week?.days[state.dayIndex] : null;
  if (!day) {
    els.day.textContent = "";
    els.date.textContent = "";
    els.menu.innerHTML = "";
    els.status.textContent = state.week
      ? "이 날짜의 식단 정보가 없습니다."
      : "정보를 불러올 수 없습니다.";
    return;
  }
  els.day.textContent = `${day.day}요일`;
  els.date.textContent = day.date;
  if (day.menuLines.length === 0) {
    els.menu.innerHTML = "";
    els.status.textContent = "아직 등록된 메뉴가 없습니다.";
    return;
  }
  els.status.textContent = "";
  els.menu.innerHTML = day.menuLines
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
}

async function loadWeek(searchWeek) {
  els.status.textContent = "불러오는 중...";
  try {
    state.week = await fetchWeek(searchWeek);
    return true;
  } catch (e) {
    state.week = null;
    render();
    return false;
  }
}

async function init() {
  if (!(await loadWeek())) return;
  const today = todayStr();
  state.dayIndex = state.week.days.findIndex((d) => d.date === today);
  render();
}

async function goNext() {
  if (!state.week) return;
  if (state.dayIndex >= 0 && state.dayIndex < state.week.days.length - 1) {
    state.dayIndex += 1;
    render();
    return;
  }
  if (state.dayIndex < 0 && state.week.days.length > 0) {
    state.dayIndex = 0;
    render();
    return;
  }
  if (!state.week.nextWeek) return;
  if (!(await loadWeek(state.week.nextWeek))) return;
  state.dayIndex = state.week.days.length > 0 ? 0 : -1;
  render();
}

async function goPrev() {
  if (!state.week) return;
  if (state.dayIndex > 0) {
    state.dayIndex -= 1;
    render();
    return;
  }
  if (!state.week.prevWeek) return;
  if (!(await loadWeek(state.week.prevWeek))) return;
  state.dayIndex = state.week.days.length > 0 ? state.week.days.length - 1 : -1;
  render();
}

els.next.addEventListener("click", goNext);
els.prev.addEventListener("click", goPrev);
init();
