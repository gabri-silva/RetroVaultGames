// Aplicado antes do CSS para evitar piscar o tema padrão ao recarregar.
(() => {
  const key = "retrovault-theme";
  const allowed = new Set(["classic", "red", "green", "metallic-blue"]);
  const valid = (value) => (allowed.has(value) ? value : "classic");
  let selected = "classic";
  try {
    selected = valid(localStorage.getItem(key));
  } catch {}
  function apply(value) {
    selected = valid(value);
    document.documentElement.dataset.theme = selected;
    const select = document.getElementById("theme-select");
    if (select) select.value = selected;
  }
  apply(selected);
  document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("theme-select");
    if (!select) return;
    select.value = selected;
    select.addEventListener("change", () => {
      apply(select.value);
      try {
        localStorage.setItem(key, selected);
      } catch {}
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();
