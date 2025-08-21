let dictionary = {};
let tooltip = null;
let isAuthenticated = false;
let isExtensionEnabled = false;


initializeExtension();

async function initializeExtension() {
  try {
   
    const authResponse = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
    isAuthenticated = authResponse.isAuthenticated;
    
  
    const storage = await chrome.storage.sync.get(['extensionEnabled', 'activeDatasets']);
    isExtensionEnabled = storage.extensionEnabled && isAuthenticated;
    
    console.log('Extension initialized:', { isAuthenticated, isExtensionEnabled });
    
    if (isExtensionEnabled) {
      await loadDictionary(storage.activeDatasets || ['n5']);
      observePage();
    } else {
      console.log('Extension disabled - authentication required');
    }
  } catch (error) {
    console.error('Error initializing extension:', error);
  }
}

async function loadDictionary(activeSets) {
  try {
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
  } catch (error) {
    console.error('Error loading dictionary:', error);
  }
}

// Listen for authentication changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_STATUS_CHANGED') {
    initializeExtension();
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

    // Determine JLPT level for color coding
    const level = getJLPTLevel(kanji);
    const levelColor = getLevelColor(level);

    tooltip.innerHTML = `
      <div class="kanji-header">
        <div class="kanji-char">${escapeHtml(kanji)}</div>
        <div class="kanji-level" style="background-color: ${levelColor}">${level}</div>
      </div>
      <div class="kanji-content">
        <div class="kanji-section">
          <span class="kanji-label">Meaning</span>
          <span class="kanji-value">${escapeHtml(entry.meaning)}</span>
        </div>
        <div class="kanji-readings">
          <div class="reading-item">
            <span class="kanji-label">On'yomi</span>
            <span class="kanji-value reading">${escapeHtml(entry.onyomi)}</span>
          </div>
          <div class="reading-item">
            <span class="kanji-label">Kun'yomi</span>
            <span class="kanji-value reading">${escapeHtml(entry.kunyomi)}</span>
          </div>
        </div>
        <div class="kanji-section">
          <span class="kanji-label">Example</span>
          <span class="kanji-value example">${escapeHtml(entry.usage)}</span>
        </div>
        <div class="kanji-actions">
          <button class="study-btn" onclick="saveKanjiStudy('${kanji}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
            Mark as Studied
          </button>
        </div>
      </div>
    `.trim();

    // Position tooltip
    const tooltipWidth = 320;
    const tooltipHeight = 280;

    let left = x + 15;
    let top = y + 15;

    if (left + tooltipWidth > window.innerWidth) {
      left = x - tooltipWidth - 15;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = y - tooltipHeight - 15;
    }

    tooltip.style.left = Math.max(10, left) + "px";
    tooltip.style.top = Math.max(10, top) + "px";
    document.body.appendChild(tooltip);


    tooltip.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    setTimeout(() => {
      removeTooltip();
    }, 10000);

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

function getJLPTLevel(kanji) {
  const storage = chrome.storage.sync.get(['activeDatasets']);

  if (Object.prototype.hasOwnProperty.call(dictionary, kanji)) {
  
    return 'N5'; 
  }
  
  return 'Unknown';
}

// Helper function to get level colors
function getLevelColor(level) {
  const colors = {
    'N5': '#4CAF50',    // Green - Basic
    'N4': '#2196F3',    // Blue - Elementary 
    'N3': '#FF9800',    // Orange - Intermediate
    'N2': '#F44336',    // Red - Upper Intermediate
    'N1': '#9C27B0',    // Purple - Advanced
    'Unknown': '#757575' // Grey - Unknown
  };
  return colors[level] || colors['Unknown'];
}


window.saveKanjiStudy = async function(kanji) {
  try {
    if (!isAuthenticated) {
      showStudyMessage('Please sign in to save your progress', 'error');
      return;
    }

    const entry = dictionary[kanji];
    if (!entry) {
      showStudyMessage('Kanji data not found', 'error');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_KANJI_STUDY',
      data: {
        kanji: kanji,
        meaning: entry.meaning,
        reading: `${entry.onyomi} / ${entry.kunyomi}`,
        level: getJLPTLevel(kanji)
      }
    });

    if (response.success) {
      showStudyMessage('Kanji saved to your study list! 📚', 'success');
    
      const button = tooltip?.querySelector('.study-btn');
      if (button) {
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
          </svg>
          Saved!
        `;
        button.classList.add('saved');
        button.disabled = true;
      }
    } else {
      showStudyMessage('Failed to save kanji. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Error saving kanji study:', error);
    showStudyMessage('Something went wrong. Please try again.', 'error');
  }
};

function showStudyMessage(message, type) {
  if (!tooltip) return;
  
  const actionsDiv = tooltip.querySelector('.kanji-actions');
  if (!actionsDiv) return;


  const existingMessage = actionsDiv.querySelector('.study-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message
  const messageDiv = document.createElement('div');
  messageDiv.className = `study-message ${type}`;
  messageDiv.textContent = message;
  
  actionsDiv.appendChild(messageDiv);

  
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 3000);
}
