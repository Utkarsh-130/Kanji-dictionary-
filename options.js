document.addEventListener('DOMContentLoaded', () => {
    const n5 = document.getElementById('n5');
    const n4 = document.getElementById('n4');
    const n3 = document.getElementById('n3');
    const save = document.getElementById('save');
  
    chrome.storage.sync.get(["activeDatasets"], (result) => {
      const sets = result.activeDatasets || ["n5"];
      n5.checked = sets.includes("n5");
      n4.checked = sets.includes("n4");
      n3.checked = sets.includes("n3");
    });
  
    save.addEventListener("click", () => {
      const active = [];
      if (n5.checked) active.push("n5");
      if (n4.checked) active.push("n4");
      if (n3.checked) active.push("n3");
  
      chrome.storage.sync.set({ activeDatasets: active }, () => {
        alert("Settings saved!");
      });
    });
  });
  