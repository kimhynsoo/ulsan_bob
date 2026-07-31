# UC 교직원식당 식단표 크롬 확장프로그램 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 크롬 확장프로그램 아이콘을 클릭하면 팝업에 울산과학대 동부캠퍼스 교직원식당의 오늘 점심 메뉴를 보여주고, ◀▶ 버튼으로 다른 날짜(주 경계를 넘어서도)를 탐색할 수 있게 한다.

**Architecture:** Manifest V3, `action.default_popup`만 사용하는 3-파일 구조(manifest.json, popup.html, popup.js + diet.js). 백그라운드 서비스워커/컨텐츠스크립트 없음. 팝업이 열릴 때 `https://www.uc.ac.kr/www/CMS/DietMenuMgr/listByWeek.do?mCode=MN207&searchDietCategory=4`를 직접 fetch해서 서버 렌더링된 HTML을 `DOMParser`로 파싱한다. 영양성분은 원본에 데이터가 없으므로 다루지 않는다.

**Tech Stack:** 순수 HTML/CSS/JS(ES modules), 외부 의존성 없음.

## Global Constraints
- 동부캠퍼스 고정 (`searchDietCategory=4`), 서부/토글 없음 — 스펙 결정사항.
- 영양성분 표시 안 함 — 원본 사이트에 데이터 없음.
- 자동화 테스트 프레임워크 도입하지 않음 — 크롬에 언패킹 로드해서 수동 검증 (스펙의 "검증" 섹션).
- `host_permissions`에 `https://www.uc.ac.kr/*` 필수 (팝업 fetch의 CORS 우회).

---

### Task 1: 확장프로그램 셸 (manifest + 정적 팝업)

**Files:**
- Create: `manifest.json`
- Create: `popup.html`

**Interfaces:**
- Produces: `popup.html`이 노출하는 DOM id들 — `#prevBtn`, `#nextBtn`, `#day`, `#date`, `#status`, `#menu` (Task 2의 popup.js가 이 id들을 그대로 사용함).

- [ ] **Step 1: manifest.json 작성**

```json
{
  "manifest_version": 3,
  "name": "울산과학대 교직원식당 식단표",
  "version": "1.0.0",
  "description": "울산과학대학교 동부캠퍼스 교직원식당 오늘의 점심 메뉴를 보여줍니다.",
  "action": {
    "default_popup": "popup.html"
  },
  "host_permissions": [
    "https://www.uc.ac.kr/*"
  ]
}
```

- [ ] **Step 2: popup.html 작성 (정적 셸, JS는 Task 2에서 연결)**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>교직원식당 식단표</title>
<style>
  body { width: 320px; font-family: -apple-system, "Malgun Gothic", sans-serif; padding: 16px; margin: 0; }
  .nav { display: flex; align-items: center; justify-content: space-between; }
  .nav button { font-size: 18px; padding: 4px 10px; cursor: pointer; }
  .title { text-align: center; }
  #day { font-size: 20px; font-weight: bold; }
  #date { color: #666; font-size: 13px; }
  #menu { list-style: none; padding: 0; margin: 12px 0 0; }
  #menu li { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 15px; }
  #status { text-align: center; color: #999; padding: 20px 0; }
</style>
</head>
<body>
  <div class="nav">
    <button id="prevBtn" aria-label="이전 날">◀</button>
    <div class="title">
      <div id="day"></div>
      <div id="date"></div>
    </div>
    <button id="nextBtn" aria-label="다음 날">▶</button>
  </div>
  <div id="status">불러오는 중...</div>
  <ul id="menu"></ul>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 3: popup.js 빈 파일 생성 (모듈 로드 에러 방지용 임시)**

```js
// Task 2에서 구현
```

- [ ] **Step 4: 크롬에 언패킹 로드해서 확인**

`chrome://extensions` → 개발자 모드 ON → "압축해제된 확장 프로그램을 로드합니다" → 이 프로젝트 폴더 선택.
Expected: 확장프로그램 아이콘이 툴바에 나타나고, 클릭하면 "불러오는 중..." 텍스트와 ◀▶ 버튼이 있는 팝업이 뜬다. 콘솔 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add manifest.json popup.html popup.js
git commit -m "Add extension shell: manifest and static popup"
```

---

### Task 2: 데이터 fetch/파싱 + 렌더링/네비게이션 로직

**Files:**
- Create: `diet.js`
- Modify: `popup.js` (Task 1에서 만든 빈 파일을 실제 구현으로 교체)

**Interfaces:**
- Consumes: Task 1의 `popup.html` DOM id들 (`#prevBtn`, `#nextBtn`, `#day`, `#date`, `#status`, `#menu`).
- Produces:
  - `diet.js`: `export function parseWeekHtml(html: string): { days: Array<{day: string, date: string, menuLines: string[]}>, prevWeek: string|null, nextWeek: string|null }`
  - `diet.js`: `export async function fetchWeek(searchWeek?: string): Promise<ReturnType<typeof parseWeekHtml>>`

- [ ] **Step 1: diet.js 작성 (fetch + 파싱 순수 로직)**

```js
const LIST_URL = "https://www.uc.ac.kr/www/CMS/DietMenuMgr/listByWeek.do?mCode=MN207&searchDietCategory=4";

export function parseWeekHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("#cafeteria-menu table");
  if (!table) return { days: [], prevWeek: null, nextWeek: null };

  const headThs = Array.from(table.querySelectorAll("thead th")).slice(1);
  const dateInfos = headThs.map((th) => ({
    day: th.querySelector(".day")?.textContent.trim() ?? "",
    date: th.querySelector(".date")?.textContent.trim() ?? "",
  }));

  const lunchRow = Array.from(table.querySelectorAll("tbody tr")).find(
    (tr) => tr.querySelector("th")?.textContent.trim() === "점심"
  );

  const days = lunchRow
    ? Array.from(lunchRow.querySelectorAll("td")).map((td, i) => ({
        day: dateInfos[i]?.day ?? "",
        date: dateInfos[i]?.date ?? "",
        menuLines: td.innerHTML
          .split(/<br\s*\/?>/i)
          .map((line) => decodeHtml(line).trim())
          .filter(Boolean),
      }))
    : [];

  const prevWeek = extractWeekParam(doc.querySelector(".menu-navi .prev"));
  const nextWeek = extractWeekParam(doc.querySelector(".menu-navi .next"));

  return { days, prevWeek, nextWeek };
}

function extractWeekParam(button) {
  const onclick = button?.getAttribute("onclick") ?? "";
  return onclick.match(/changeCalendar\('(\d+)'\)/)?.[1] ?? null;
}

function decodeHtml(html) {
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}

export async function fetchWeek(searchWeek) {
  let res;
  if (searchWeek == null) {
    res = await fetch(LIST_URL);
  } else {
    const body = new URLSearchParams({
      mCode: "MN207",
      searchWeek,
      searchDietCategory: "4",
    });
    res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseWeekHtml(await res.text());
}
```

- [ ] **Step 2: popup.js 구현 (렌더링 + 오늘 찾기 + 이전/다음 날 네비게이션)**

```js
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
  els.status.textContent = "";
  els.day.textContent = `${day.day}요일`;
  els.date.textContent = day.date;
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
  const idx = state.week.days.findIndex((d) => d.date === today);
  state.dayIndex = idx;
  if (idx < 0 && state.week.days.length > 0) {
    // 오늘이 이번 주 평일에 없음(주말 등): 메시지 보여주되 이동은 가능하게 유지
    state.dayIndex = -1;
  }
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
```

- [ ] **Step 3: 크롬에서 리로드 후 실제 동작 확인**

`chrome://extensions`에서 해당 확장프로그램 새로고침 버튼 클릭 → 아이콘 클릭.

Expected:
- 오늘(2026-07-31, 금요일) 점심 메뉴가 요일/날짜와 함께 리스트로 표시됨 (원산지 행은 표시되지 않음).
- ◀ 버튼을 4번 눌러 월요일까지 이동 가능, 각 클릭마다 해당 요일 메뉴로 바뀜.
- ◀를 한 번 더 눌러 주 경계를 넘으면 지난주로 fetch되어 금요일 메뉴가 표시됨 (네트워크 탭에서 POST 요청 확인).
- ▶를 여러 번 눌러 원래 주로 복귀 후 금요일을 지나 다음 주 월요일로 자연스럽게 이동.
- 개발자 도구 콘솔에 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add diet.js popup.js
git commit -m "Implement diet menu fetch/parse and popup day navigation"
```

---

## Self-Review Notes
- 스펙의 모든 섹션(구조 3파일, 데이터 흐름 1~4, 에러 처리, 검증)이 Task 1~2에 매핑됨.
- 플레이스홀더 없음 — 모든 코드가 완성된 실행 가능한 형태로 작성됨.
- `diet.js`가 export하는 `parseWeekHtml`/`fetchWeek` 시그니처가 `popup.js`의 import·호출부와 일치함.
