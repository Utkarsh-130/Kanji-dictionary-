let dictionary = {};
let tooltip = null;

chrome.storage.sync.get(["activeDatasets"], async (result) => {
  try {
    const activeSets = result.activeDatasets || ["n5"];
    const datasets = {
      n5: "dictionaryn5.json",
      n4: "dictionaryn4.json",
      n3: "dictionaryn3.json",
      n2: "dictionaryn2.json",
    };

    const loadPromises = activeSets.map(async set => {
      try {
        const response = await fetch(chrome.runtime.getURL(datasets[set]));
        if (!response.ok) {
          throw new Error(`Failed to load ${datasets[set]}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`Error loading ${datasets[set]}:`, error);
        return {};
      }
    });

    const loaded = await Promise.all(loadPromises);
    loaded.forEach(dict => Object.assign(dictionary, dict));
    console.log('Loaded dictionary entries:', Object.keys(dictionary).length);
    observePage();
  } catch (error) {
    console.error('Error initializing dictionary:', error);
  }
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
  try {
    removeTooltip();
    const entry = dictionary[kanji];
    if (!entry) return;

    tooltip = document.createElement("div");
    tooltip.className = "kanji-tooltip";

 
    const escapeHtml = (text) => {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

  
    tooltip.innerHTML = `
      <strong>${escapeHtml(kanji)}</strong><br>
      <b>Meaning:</b> ${escapeHtml(entry.meaning)}<br><br>
      <b>Onyomi:</b> ${escapeHtml(entry.onyomi)}<br>
      <b>Kunyomi:</b> ${escapeHtml(entry.kunyomi)}<br><br>
      <b>Example:</b> ${escapeHtml(entry.usage)}
    `.trim();

    const rect = document.body.getBoundingClientRect();
    const tooltipWidth = 300; // max-width from CSS
    const tooltipHeight = 200; // approximate height

    let left = x + 10;
    let top = y + 10;

    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - 10;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = y - tooltipHeight - 10;
    }

    tooltip.style.left = Math.max(0, left) + "px";
    tooltip.style.top = Math.max(0, top) + "px";
    document.body.appendChild(tooltip);
  } catch (error) {
    console.error('Error showing tooltip:', error);
  }
}

function removeTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}
