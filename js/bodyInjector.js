(() => {
  // 안전한 정규식 이스케이프
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // map template CODES -> body filenames (without .html)
  const CODE_TO_FILE = {
    MEM_BJOIN: "mem_bjoin",
    MEM_FINDP: "mem_findp",
    MEM_VERIC: "mem_veric",
    // add more mappings if needed
  };

  // 1) 코드 탐지: data-template-code 우선, URL query(code) 다음, 파일명 맵핑 마지막
  function detectCode() {
    const main = document.querySelector("main[data-template-code]");
    if (main && main.dataset.templateCode) return main.dataset.templateCode;

    const params = new URLSearchParams(location.search);
    if (params.has("code")) return params.get("code");

    const file = location.pathname.split("/").pop().replace(".html", "");
    const map = {
      mem_bjoin: "MEM_BJOIN",
      mem_findp: "MEM_FINDP",
      mem_veric: "MEM_VERIC",
      signIn_ko: "MEM_BJOIN",
      reset_password_ko: "MEM_FINDP",
    };
    return map[file] || file.toUpperCase();
  }

  // SAMPLE_MAP 제거 — URL 쿼리만으로 데이터 구성
  // 2) URL 쿼리값만 반환
  function buildData() {
    const params = new URLSearchParams(location.search);
    const data = {};
    for (const [k, v] of params.entries()) {
      data[k] = decodeURIComponent(v);
    }
    return data;
  }

  // 3) 노드 내부 텍스트 + 주요 속성에서 플레이스홀더 치환
  function replacePlaceholdersInNode(node, data) {
    if (!data) return;
    if (node.nodeType === Node.TEXT_NODE) {
      let txt = node.textContent;
      for (const key of Object.keys(data)) {
        txt = txt.replace(new RegExp(esc(`#{${key}}`), "g"), data[key]);
      }
      node.textContent = txt;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 치환할 속성 목록
      const attrs = ["href", "src", "alt", "title", "value"];
      for (const a of attrs) {
        if (node.hasAttribute && node.hasAttribute(a)) {
          let val = node.getAttribute(a);
          for (const key of Object.keys(data)) {
            val = val.replace(new RegExp(esc(`#{${key}}`), "g"), data[key]);
          }
          node.setAttribute(a, val);
        }
      }
      // textContent 치환(요소 내부 텍스트 포함)
      for (const child of Array.from(node.childNodes)) replacePlaceholdersInNode(child, data);
    }
  }

  // 4) body fragment 불러와 삽입 (샘플 데이터 사용 안함 — 쿼리만)
  async function loadBodyFragment(code) {
    const target = document.getElementById("dynamicBody");
    if (!target) return;
    // resolve code -> actual filename (use mapping, otherwise lowercase the code)
    const bodyFile = CODE_TO_FILE[code] || code.toLowerCase();
    const fragmentPath = `./components/bodies/${bodyFile}.html`;
    try {
      const res = await fetch(fragmentPath);
      if (!res.ok) throw new Error(`Fragment not found: ${fragmentPath}`);
      let html = await res.text();
      // insert raw HTML first
      target.innerHTML = html;
      // URL 쿼리만으로 데이터 구성
      const data = buildData();
      // replace placeholders inside inserted fragment
      replacePlaceholdersInNode(target, data);
    } catch (err) {
      console.error(err);
      target.innerHTML = `<p style="color:red">본문 로드 실패: ${err.message}</p>`;
    }
  }

  // 5) data-include 요소 로드 (footer 등) — include 내부도 URL 쿼리로 치환
  async function loadIncludes() {
    const includes = document.querySelectorAll("[data-include]");
    const data = buildData();
    for (const el of includes) {
      const file = el.getAttribute("data-include");
      try {
        const res = await fetch(file);
        if (!res.ok) {
          el.innerHTML = `<p style="color:red">Include not found: ${file}</p>`;
          continue;
        }
        const html = await res.text();
        el.innerHTML = html;
        // include 내부 플레이스홀더 치환 (쿼리만)
        replacePlaceholdersInNode(el, data);
        // footer style safety
        const loadedFooter = el.querySelector(".footer");
        if (loadedFooter) {
          loadedFooter.style.width = "100%";
          loadedFooter.style.boxSizing = "border-box";
        }
      } catch (e) {
        console.error("Include load error:", e);
        el.innerHTML = `<p style="color:red">Include error: ${e.message}</p>`;
      }
    }
  }

  // 6) 페이지 제목/설명 치환 (쿼리만)
  function replaceHeaderPlaceholders() {
    const data = buildData();
    const titleEl = document.getElementById("pageTitle");
    const descEl = document.getElementById("pageDesc");
    if (titleEl) replacePlaceholdersInNode(titleEl, data);
    if (descEl) replacePlaceholdersInNode(descEl, data);
  }

  // init
  document.addEventListener("DOMContentLoaded", async () => {
    const code = detectCode();
    replaceHeaderPlaceholders();
    await loadIncludes();
    await loadBodyFragment(code);
  });

  // 디버그용 전역 유틸 (콘솔에서 사용) — SAMPLE_MAP 제거
  window.__emailTemplateUtils = {
    detectCode,
    buildData,
  };
})();
