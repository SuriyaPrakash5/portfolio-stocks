let activeAppFilter = null;

let stocks = JSON.parse(localStorage.getItem("stocks")) || [];

function formatMoney(val) {
  return Number(val).toFixed(2);
}

/* ---------------- DARK MODE ---------------- */
function toggleDark() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

/* --------- AUTO FIX OLD / CORRUPTED DATA --------- */
stocks = stocks.map(s => {
  let value = s.currentPrice * s.quantity;
  return {
    name: s.name || "Unnamed Stock",
    buyPrice: Number(s.buyPrice),
    quantity: Number(s.quantity),
    currentPrice: Number(s.currentPrice),
    app: s.app || "Unknown",
    lastUpdated: s.lastUpdated || Date.now(),
    prevValue: s.prevValue ?? value
  };
});
localStorage.setItem("stocks", JSON.stringify(stocks));

/* ---------------- DASHBOARD ---------------- */
function renderDashboard() {
  if (!document.getElementById("stockList")) return;

  let totalInvested = 0;
  let currentValue = 0;
  let todayPL = 0;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let list = document.getElementById("stockList");
  list.innerHTML = "";

  // 🔥 APPLY FILTER IF SELECTED
  let displayStocks = activeAppFilter
    ? stocks.filter(s => s.app === activeAppFilter)
    : stocks;

  displayStocks.forEach((s, i) => {
    let invested = s.buyPrice * s.quantity;
    let value = s.currentPrice * s.quantity;
    let pl = value - invested;

    totalInvested += invested;
    currentValue += value;

    if (now - s.lastUpdated <= dayMs) {
      todayPL += value - s.prevValue;
    }

    list.innerHTML += `
      <div class="stock-card" onclick="editStock(${i})">
        <div class="stock-top">
          <div>
            <div class="stock-name">${s.name}</div>
            <div class="stock-app">${s.app}</div>
          </div>
          <div class="${pl >= 0 ? 'green' : 'red'}">
            ${pl >= 0 ? "▲" : "▼"} ₹${Math.abs(pl).toFixed(2)}
          </div>
        </div>
      <!-- INVESTED / CURRENT ROW -->
      <div class="stock-values">
        <span>Invested ₹${invested.toFixed(2)}</span>
        <span>Current ₹${value.toFixed(2)}</span>
      </div>

      <!-- MINI P/L BAR -->

      </div>
    `;
  });

  let totalPL = currentValue - totalInvested;
  let percent = totalInvested ? (totalPL / totalInvested) * 100 : 0;

  document.getElementById("totalInvested").innerText =
    "₹" + totalInvested.toFixed(2);
  document.getElementById("currentValue").innerText =
    "₹" + currentValue.toFixed(2);

  document.getElementById("totalPL").innerText =
    `${totalPL >= 0 ? "▲" : "▼"} ₹${Math.abs(totalPL).toFixed(2)}`;

  document.getElementById("totalPLPercent").innerText =
    percent.toFixed(2) + "%";

  document.getElementById("todayPL").innerText =
    `${todayPL >= 0 ? "▲" : "▼"} ₹${Math.abs(todayPL).toFixed(2)}`;

  let card = document.getElementById("summaryCard");
  card.classList.remove("profit", "loss");
  card.classList.add(totalPL >= 0 ? "profit" : "loss");
}
renderDashboard();

/* ---------------- SAVE (FIXED) ---------------- */
function saveStock(e) {
  e.preventDefault();

  // 🔥 EXPLICIT ELEMENT FETCH (MOBILE SAFE)
  const nameEl = document.getElementById("name");
  const buyPriceEl = document.getElementById("buyPrice");
  const quantityEl = document.getElementById("quantity");
  const currentPriceEl = document.getElementById("currentPrice");
  const appEl = document.getElementById("app");
  const editIndexEl = document.getElementById("editIndex");

  if (!nameEl || !appEl) {
    alert("Form not loaded properly");
    return;
  }

  let now = Date.now();
  let index = editIndexEl.value;

  let stockData = {
    name: nameEl.value.trim(),
    buyPrice: +buyPriceEl.value,
    quantity: +quantityEl.value,
    currentPrice: +currentPriceEl.value,
    app: appEl.value.trim(),
    lastUpdated: now
  };

  if (index === "") {
    /* ADD NEW */
    let value = stockData.currentPrice * stockData.quantity;
    stockData.prevValue = value;
    stocks.push(stockData);
  } else {
    /* EDIT */
    let old = stocks[index];
    let oldValue = old.currentPrice * old.quantity;
    stockData.prevValue = oldValue;
    stocks[index] = { ...old, ...stockData };
  }

  localStorage.setItem("stocks", JSON.stringify(stocks));
  window.location.href = "index.html";
}


/* ---------------- EDIT ---------------- */
function editStock(i) {
  localStorage.setItem("editIndex", i);
  window.location.href = "add.html";
}

/* ---------------- LOAD EDIT ---------------- */
if (localStorage.getItem("editIndex")) {
  let i = localStorage.getItem("editIndex");
  let s = stocks[i];

  if (s) {
    editIndex.value = i;
    name.value = s.name;
    buyPrice.value = s.buyPrice;
    quantity.value = s.quantity;
    currentPrice.value = s.currentPrice;
    app.value = s.app;
  }

  localStorage.removeItem("editIndex");
}
/* -------- APP INVESTMENT CHART -------- */
function renderAppChart(stocks) {
  let appTotals = {};
  let totalInvested = 0;

  stocks.forEach(s => {
    let invested = s.buyPrice * s.quantity;
    totalInvested += invested;
    appTotals[s.app] = (appTotals[s.app] || 0) + invested;
  });

  const labels = Object.keys(appTotals);
  const data = labels.map(app =>
    ((appTotals[app] / totalInvested) * 100).toFixed(2)
  );

  const colors = [
    "#22c55e", "#3b82f6", "#f97316",
    "#ec4899", "#a855f7", "#14b8a6"
  ];

  const ctx = document.getElementById("appChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      cutout: "70%",
      animation: {
        animateRotate: true,
        duration: 800,
        easing: "easeOutCubic"
      },
      onClick: (_, elements) => {
        if (!elements.length) return;
        const app = labels[elements[0].index];
        activeAppFilter = activeAppFilter === app ? null : app;
        renderDashboard();
      },
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}


renderAppChart(stocks);
function renderAppPLChart(stocks) {
  let plByApp = {};

  stocks.forEach(s => {
    let pl = (s.currentPrice - s.buyPrice) * s.quantity;
    plByApp[s.app] = (plByApp[s.app] || 0) + pl;
  });

  new Chart(document.getElementById("appPLChart"), {
    type: "bar",
    data: {
      labels: Object.keys(plByApp),
      datasets: [{
        data: Object.values(plByApp),
        backgroundColor: Object.values(plByApp)
          .map(v => v >= 0 ? "#22c55e" : "#ef4444")
      }]
    },
    options: {
      plugins: { legend: { display: false } }
    }
  });
}

renderAppPLChart(stocks);

function formatINR(num) {
  if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
  if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)} L`;
  return `₹${num.toFixed(2)}`;
}

