async function includeHTML() {
  const elements = document.querySelectorAll("[data-include]");

  for (const element of elements) {
    const file = element.getAttribute("data-include");
    try {
      const response = await fetch(file);
      if (response.ok) {
        const html = await response.text();
        element.innerHTML = html;
      } else {
        element.innerHTML = "Component not found";
      }
    } catch (error) {
      console.error("Error loading component:", error);
      element.innerHTML = "Error loading component";
    }
  }
}

// DOM이 로드되면 자동 실행
document.addEventListener("DOMContentLoaded", includeHTML);
