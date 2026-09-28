const LIST_URL = "https://www.uc.ac.kr/kr/CMS/DietMenuMgr/list.do?mCode=MN187&searchDietCategory=4";

export function parseWeekHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("#cafeteria-menu table");
  if (!table) return { days: [], prevWeek: null, nextWeek: null };

  const headThs = Array.from(table.querySelectorAll("thead th")).slice(1);
  const dateInfos = headThs.map((th) => ({
    day: (th.querySelector(".day")?.textContent.trim() ?? "").replace(/[()]/g, ""),
    date: [
      th.querySelector(".mon")?.textContent.trim().replace(".", "-") ?? "",
      th.querySelector(".date")?.textContent.trim().padStart(2, "0") ?? "",
    ].join("-"),
  }));

  const lunchRow = Array.from(table.querySelectorAll("tbody tr")).find(
    (tr) => tr.querySelector("th")?.textContent.trim() === "중식"
  );

  const days = lunchRow
    ? Array.from(lunchRow.querySelectorAll("td")).map((td, i) => ({
        day: dateInfos[i]?.day ?? "",
        date: dateInfos[i]?.date ?? "",
        sections: splitSections(
          td.innerHTML
            .replace(/<!--[\s\S]*?-->/g, "")
            .split(/<br\s*\/?>/i)
            .map((line) => decodeHtml(line).trim())
            .filter(Boolean)
        ),
      }))
    : [];

  const prevWeek = extractWeekParam(doc.querySelector(".menu-navi .prev"));
  const nextWeek = extractWeekParam(doc.querySelector(".menu-navi .next"));

  return { days, prevWeek, nextWeek };
}

// 중식 셀은 <데일리>/<교직원>/<푸드코트> 소제목으로 나뉜다.
// 데일리는 교직원과 거의 같은 메뉴라 뺀다. 소제목이 없는 주는 통째로 한 섹션.
function splitSections(lines) {
  const sections = [];
  for (const line of lines) {
    const title = line.match(/^<(.+)>$/)?.[1];
    if (title) sections.push({ title, items: [] });
    else {
      if (sections.length === 0) sections.push({ title: "", items: [] });
      sections[sections.length - 1].items.push(line);
    }
  }
  return sections.filter((s) => s.items.length > 0 && s.title !== "데일리");
}

function extractWeekParam(button) {
  const onclick = button?.getAttribute("onclick") ?? "";
  return onclick.match(/changeCalendar\('([\d-]+)'\)/)?.[1] ?? null;
}

function decodeHtml(html) {
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}

export async function fetchWeek(searchDay) {
  let res;
  if (searchDay == null) {
    res = await fetch(LIST_URL);
  } else {
    const body = new URLSearchParams({
      mCode: "MN187",
      searchDay,
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
