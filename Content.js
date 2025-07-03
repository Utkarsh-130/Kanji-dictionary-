let dictionary = {};
let tooltip = null;

chrome.storage.sync.get(["activeDatasets"], async (result) => {
  const activeSets = result.activeDatasets || ["n5"];
  const datasets = {
    n5: "dictionaryn5.json",
    n4: "dictionaryn4.json",
    n3: "dictionaryn3.json"
  };

  const loadPromises = activeSets.map(set =>
    fetch(chrome.runtime.getURL(datasets[set]))
      .then(res => res.json())
  );

  const loaded = await Promise.all(loadPromises);
  loaded.forEach(dict => Object.assign(dictionary, dict));
  observePage();
});

function observePage() {
  document.body.addEventListener("mouseover", event => {
    const kanji = getKanjiUnderCursor(event);
    if (kanji && dictionary[kanji]) {
      showTooltip(event.pageX, event.pageY, kanji);
    } else {
      removeTooltip();
    }
  });

  document.body.addEventListener("mouseout", removeTooltip);
}

function getKanjiUnderCursor(event) {
  const range = document.caretRangeFromPoint(event.clientX, event.clientY);
  if (!range) return null;
  const char = range.startContainer?.textContent?.[range.startOffset];
  return /[\u4e00-\u9faf]/.test(char) ? char : null;
}

function showTooltip(x, y, kanji) {
  removeTooltip();
  const entry = dictionary[kanji];
  if (!entry) return;
  tooltip = document.createElement("div");
  tooltip.className = "kanji-tooltip";
  tooltip.innerHTML = `
    <strong>${kanji}</strong><br>
    <b>Meaning:</b> ${entry.meaning}<br>
    <b>Onyomi:</b> ${entry.onyomi}<br>
    <b>Kunyomi:</b> ${entry.kunyomi}<br>
    <b>Example:</b> ${entry.usage}
  `;
  tooltip.style.left = x + 10 + "px";
  tooltip.style.top = y + 10 + "px";
  document.body.appendChild(tooltip);
}

function removeTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}
