document.addEventListener('DOMContentLoaded', () => {
    const n5 = document.getElementById('n5');
    const n4 = document.getElementById('n4');
    const n3 = document.getElementById('n3');
    const n2 = document.getElementById('n2');
    const n1 = document.getElementById('n1');
    const save = document.getElementById('save');
    const status = document.createElement('div');
    status.style.marginTop = '10px';
    document.body.appendChild(status);

    function updateCheckboxStates() {
        const anyChecked = n5.checked || n4.checked || n3.checked || n2.checked || n1.checked;
        if (!anyChecked) {
            n5.checked = true;
        }
        save.disabled = !anyChecked;
    }

    [n5, n4, n3, n2, n1].forEach(checkbox => {
        checkbox.addEventListener('change', updateCheckboxStates);
    });

    chrome.storage.sync.get(["activeDatasets"], (result) => {
        const sets = result.activeDatasets || ["n5"];
        n5.checked = sets.includes("n5");
        n4.checked = sets.includes("n4");
        n3.checked = sets.includes("n3");
        n2.checked = sets.includes("n2");
        n1.checked = sets.includes("n1");
        updateCheckboxStates();
    });

    save.addEventListener("click", () => {
        const active = [];
        if (n5.checked) active.push("n5");
        if (n4.checked) active.push("n4");
        if (n3.checked) active.push("n3");

        chrome.storage.sync.set({ activeDatasets: active }, () => {
            status.textContent = "Settings saved! Refresh your pages to apply changes.";
            status.style.color = "green";
            setTimeout(() => {
                status.textContent = "";
            }, 3000);
        });
    });
});
  