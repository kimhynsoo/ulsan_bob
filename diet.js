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
