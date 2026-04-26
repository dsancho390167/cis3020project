document.addEventListener("DOMContentLoaded", () => {
  setFooterYear();
  initializeRatePage();
  initializeAppliancesPage();
  initializeDashboardPage();
});

function setFooterYear() {
  const yearSpan = document.getElementById("year");

  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}

/* ------------------------------ */
/* Rate Page Logic                */
/* ------------------------------ */

function initializeRatePage() {
  const rateForm = document.getElementById("rate-form");
  const rateValueInput = document.getElementById("rate-value");
  const rateUnitSelect = document.getElementById("rate-unit");
  const ratePreview = document.getElementById("rate-preview");
  const rateStatus = document.getElementById("rate-status");

  if (!rateForm || !rateValueInput || !rateUnitSelect || !ratePreview || !rateStatus) {
    return;
  }

  loadSavedRate(rateValueInput, rateUnitSelect, ratePreview);

  rateValueInput.addEventListener("input", () => {
    updateRatePreview(rateValueInput, rateUnitSelect, ratePreview);
  });

  rateUnitSelect.addEventListener("change", () => {
    updateRatePreview(rateValueInput, rateUnitSelect, ratePreview);
  });

  rateForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const rawValue = Number(rateValueInput.value);
    const unit = rateUnitSelect.value;

    if (!isValidRate(rawValue)) {
      rateStatus.textContent = "Please enter a valid rate greater than 0.";
      rateStatus.classList.add("error-message");
      return;
    }

    const rateInDollars = convertRateToDollars(rawValue, unit);

    localStorage.setItem("electricRate", rateInDollars.toFixed(4));
    localStorage.setItem("electricRateUnit", unit);
    localStorage.setItem("electricRateOriginalValue", rawValue);

    rateStatus.textContent = `Rate saved successfully: $${rateInDollars.toFixed(4)} per kWh`;
    rateStatus.classList.remove("error-message");

    updateRatePreview(rateValueInput, rateUnitSelect, ratePreview);
  });
}

function loadSavedRate(rateValueInput, rateUnitSelect, ratePreview) {
  const savedOriginalValue = localStorage.getItem("electricRateOriginalValue");
  const savedUnit = localStorage.getItem("electricRateUnit");

  if (savedOriginalValue && savedUnit) {
    rateValueInput.value = savedOriginalValue;
    rateUnitSelect.value = savedUnit;
  }

  updateRatePreview(rateValueInput, rateUnitSelect, ratePreview);
}

function updateRatePreview(rateValueInput, rateUnitSelect, ratePreview) {
  const rawValue = Number(rateValueInput.value);
  const unit = rateUnitSelect.value;

  if (!isValidRate(rawValue)) {
    ratePreview.textContent = "Enter a rate to preview the saved $ / kWh value.";
    return;
  }

  const rateInDollars = convertRateToDollars(rawValue, unit);
  ratePreview.textContent = `This will be saved as $${rateInDollars.toFixed(4)} per kWh.`;
}

function convertRateToDollars(value, unit) {
  if (unit === "cents") {
    return value / 100;
  }

  return value;
}

function isValidRate(value) {
  return !Number.isNaN(value) && value > 0;
}

function getSavedRate() {
  const savedRate = Number(localStorage.getItem("electricRate"));
  return Number.isNaN(savedRate) || savedRate <= 0 ? null : savedRate;
}

/* ------------------------------ */
/* Appliances Page Logic          */
/* ------------------------------ */

function initializeAppliancesPage() {
  const searchForm = document.getElementById("appliance-search-form");
  const applianceForm = document.getElementById("appliance-form");
  const rateBanner = document.getElementById("rate-banner");
  const trackedAppliancesList = document.getElementById("tracked-appliances-list");

  if (!searchForm || !applianceForm || !rateBanner || !trackedAppliancesList) {
    return;
  }

  const refs = {
    rateBanner,
    searchBrand: document.getElementById("search-brand"),
    searchModel: document.getElementById("search-model"),
    searchStatus: document.getElementById("search-status"),
    manualEntryBtn: document.getElementById("manual-entry-btn"),

    applianceForm,
    applianceName: document.getElementById("appliance-name"),
    applianceCategory: document.getElementById("appliance-category"),
    applianceVoltage: document.getElementById("appliance-voltage"),
    applianceAmperage: document.getElementById("appliance-amperage"),
    applianceEnergyStar: document.getElementById("appliance-energy-star"),
    applianceWatts: document.getElementById("appliance-watts"),
    hoursPerDay: document.getElementById("hours-per-day"),
    daysPerWeek: document.getElementById("days-per-week"),
    quantity: document.getElementById("quantity"),
    notes: document.getElementById("notes"),

    previewDailyKwh: document.getElementById("preview-daily-kwh"),
    previewMonthlyKwh: document.getElementById("preview-monthly-kwh"),
    previewMonthlyCost: document.getElementById("preview-monthly-cost"),

    applianceStatus: document.getElementById("appliance-status"),
    addApplianceBtn: document.getElementById("add-appliance-btn"),
    clearApplianceFormBtn: document.getElementById("clear-appliance-form-btn"),

    trackedAppliancesList
  };

  const rate = getSavedRate();
  updateRateBanner(refs.rateBanner, rate);

  if (!rate) {
    refs.addApplianceBtn.disabled = true;
  }

  renderTrackedAppliances(getStoredAppliances(), refs.trackedAppliancesList, rate);
  updateEstimatePreview(refs, rate);

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const brandQuery = refs.searchBrand.value.trim();
    const modelQuery = refs.searchModel.value.trim();

    if (!brandQuery && !modelQuery) {
      refs.searchStatus.textContent = "Enter a brand, a model number, or both to search.";
      refs.searchStatus.classList.add("error-message");
      return;
    }

    const match = findBestApplianceMatch(brandQuery, modelQuery);

    if (match) {
      populateApplianceFields(match, refs);
      refs.searchStatus.textContent = `Match found: ${match.brand} ${match.model}`;
      refs.searchStatus.classList.remove("error-message");
    } else {
      prepareManualEntryFromSearch(brandQuery, modelQuery, refs);
      refs.searchStatus.textContent = "No exact match found. You can continue with manual entry.";
      refs.searchStatus.classList.remove("error-message");
    }

    updateEstimatePreview(refs, rate);
  });

  refs.manualEntryBtn.addEventListener("click", () => {
    clearApplianceFields(refs);
    refs.searchStatus.textContent = "Manual entry enabled. Fill in the appliance details yourself.";
    refs.searchStatus.classList.remove("error-message");
    updateEstimatePreview(refs, rate);
  });

  refs.applianceForm.addEventListener("input", () => {
    refs.applianceStatus.textContent = "";
    updateEstimatePreview(refs, rate);
  });

  refs.applianceForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!rate) {
      refs.applianceStatus.textContent = "Save an electricity rate first before adding appliances.";
      refs.applianceStatus.classList.add("error-message");
      return;
    }

    const applianceData = collectApplianceFormData(refs);

    if (!isValidApplianceSubmission(applianceData)) {
      refs.applianceStatus.textContent = "Complete the required appliance and usage fields before adding it.";
      refs.applianceStatus.classList.add("error-message");
      return;
    }

    const estimate = calculateEstimate(applianceData, rate);

    const storedAppliances = getStoredAppliances();

    const applianceRecord = {
      id: Date.now(),
      ...applianceData,
      dailyKwh: estimate.dailyKwh,
      monthlyKwh: estimate.monthlyKwh,
      monthlyCost: estimate.monthlyCost
    };

    storedAppliances.push(applianceRecord);
    saveStoredAppliances(storedAppliances);
    renderTrackedAppliances(storedAppliances, refs.trackedAppliancesList, rate);

    refs.applianceStatus.textContent = `${applianceRecord.name} added successfully.`;
    refs.applianceStatus.classList.remove("error-message");

    resetAppliancePage(refs, rate);
  });

  refs.clearApplianceFormBtn.addEventListener("click", () => {
    resetAppliancePage(refs, rate);
    refs.searchStatus.textContent = "";
    refs.applianceStatus.textContent = "";
  });

  refs.trackedAppliancesList.addEventListener("click", (event) => {
    if (!event.target.matches(".remove-appliance-btn")) {
      return;
    }

    const applianceId = Number(event.target.dataset.id);
    const storedAppliances = getStoredAppliances().filter(item => item.id !== applianceId);

    saveStoredAppliances(storedAppliances);
    renderTrackedAppliances(storedAppliances, refs.trackedAppliancesList, rate);
  });
}

function updateRateBanner(rateBanner, rate) {
  if (rate) {
    rateBanner.className = "rate-banner success-banner";
    rateBanner.innerHTML = `
      <strong>Saved rate:</strong> $${rate.toFixed(4)} per kWh
    `;
  } else {
    rateBanner.className = "rate-banner warning-banner";
    rateBanner.innerHTML = `
      <strong>No electricity rate found.</strong>
      Go to <a href="rate.html" class="warning-link">Step 1: Rate</a> before adding appliances.
    `;
  }
}

function findBestApplianceMatch(brandQuery, modelQuery) {
  if (typeof APPLIANCE_LIBRARY === "undefined") {
    return null;
  }

  const normalizedBrand = brandQuery.toLowerCase();
  const normalizedModel = modelQuery.toLowerCase();

  const exactMatch = APPLIANCE_LIBRARY.find(item =>
    item.brand.toLowerCase() === normalizedBrand &&
    item.model.toLowerCase() === normalizedModel
  );

  if (exactMatch) {
    return exactMatch;
  }

  const modelExactMatch = APPLIANCE_LIBRARY.find(item =>
    (!normalizedBrand || item.brand.toLowerCase().includes(normalizedBrand)) &&
    item.model.toLowerCase() === normalizedModel
  );

  if (modelExactMatch) {
    return modelExactMatch;
  }

  const partialMatch = APPLIANCE_LIBRARY.find(item =>
    (!normalizedBrand || item.brand.toLowerCase().includes(normalizedBrand)) &&
    (!normalizedModel || item.model.toLowerCase().includes(normalizedModel))
  );

  return partialMatch || null;
}

function populateApplianceFields(match, refs) {
  refs.applianceName.value = match.name;
  refs.applianceCategory.value = match.category;
  refs.applianceVoltage.value = match.voltage;
  refs.applianceAmperage.value = match.amperage;
  refs.applianceEnergyStar.value = match.energyStar;
  refs.applianceWatts.value = match.estimatedWatts;

  if (!refs.hoursPerDay.value) {
    refs.hoursPerDay.value = getSuggestedHours(match.category);
  }

  if (!refs.daysPerWeek.value) {
    refs.daysPerWeek.value = 7;
  }

  if (!refs.quantity.value) {
    refs.quantity.value = 1;
  }
}

function prepareManualEntryFromSearch(brandQuery, modelQuery, refs) {
  clearApplianceFields(refs);

  const combinedName = `${brandQuery} ${modelQuery}`.trim();
  refs.applianceName.value = combinedName;
  refs.quantity.value = 1;
  refs.daysPerWeek.value = 7;
}

function clearApplianceFields(refs) {
  refs.applianceName.value = "";
  refs.applianceCategory.value = "";
  refs.applianceVoltage.value = "";
  refs.applianceAmperage.value = "";
  refs.applianceEnergyStar.value = "Unknown";
  refs.applianceWatts.value = "";
  refs.hoursPerDay.value = "";
  refs.daysPerWeek.value = "";
  refs.quantity.value = 1;
  refs.notes.value = "";
}

function resetAppliancePage(refs, rate) {
  refs.searchBrand.value = "";
  refs.searchModel.value = "";
  clearApplianceFields(refs);
  refs.quantity.value = 1;
  refs.searchStatus.textContent = "";
  updateEstimatePreview(refs, rate);
}

function getSuggestedHours(category) {
  const categoryMap = {
    "Kitchen": 24,
    "Cooling": 8,
    "Water Heating": 3,
    "Laundry": 1,
    "Air Quality": 12,
    "Electronics": 4
  };

  return categoryMap[category] || 4;
}

function collectApplianceFormData(refs) {
  return {
    brand: refs.searchBrand.value.trim(),
    model: refs.searchModel.value.trim(),
    name: refs.applianceName.value.trim(),
    category: refs.applianceCategory.value.trim(),
    voltage: Number(refs.applianceVoltage.value),
    amperage: Number(refs.applianceAmperage.value),
    energyStar: refs.applianceEnergyStar.value,
    watts: Number(refs.applianceWatts.value),
    hoursPerDay: Number(refs.hoursPerDay.value),
    daysPerWeek: Number(refs.daysPerWeek.value),
    quantity: Number(refs.quantity.value),
    notes: refs.notes.value.trim()
  };
}

function isValidApplianceSubmission(applianceData) {
  return (
    applianceData.name &&
    applianceData.category &&
    applianceData.watts > 0 &&
    applianceData.hoursPerDay > 0 &&
    applianceData.daysPerWeek > 0 &&
    applianceData.daysPerWeek <= 7 &&
    applianceData.quantity > 0
  );
}

function calculateEstimate(applianceData, rate) {
  const dailyKwh = (applianceData.watts * applianceData.hoursPerDay * applianceData.quantity) / 1000;
  const monthlyKwh = dailyKwh * (applianceData.daysPerWeek / 7) * 30;
  const monthlyCost = rate ? monthlyKwh * rate : null;

  return {
    dailyKwh,
    monthlyKwh,
    monthlyCost
  };
}

function updateEstimatePreview(refs, rate) {
  const applianceData = collectApplianceFormData(refs);

  if (
    applianceData.watts <= 0 ||
    applianceData.hoursPerDay <= 0 ||
    applianceData.daysPerWeek <= 0 ||
    applianceData.quantity <= 0
  ) {
    refs.previewDailyKwh.textContent = "--";
    refs.previewMonthlyKwh.textContent = "--";
    refs.previewMonthlyCost.textContent = rate ? "--" : "Save rate first";
    return;
  }

  const estimate = calculateEstimate(applianceData, rate);

  refs.previewDailyKwh.textContent = estimate.dailyKwh.toFixed(2);
  refs.previewMonthlyKwh.textContent = estimate.monthlyKwh.toFixed(2);
  refs.previewMonthlyCost.textContent = rate
    ? `$${estimate.monthlyCost.toFixed(2)}`
    : "Save rate first";
}

function getStoredAppliances() {
  const stored = localStorage.getItem("trackedAppliances");

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
}

function saveStoredAppliances(appliances) {
  localStorage.setItem("trackedAppliances", JSON.stringify(appliances));
}

function renderTrackedAppliances(appliances, container, rate) {
  if (!appliances.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No appliances added yet. Search for one above or use manual entry.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appliances
    .map(item => {
      const currentMonthlyCost = rate ? item.monthlyKwh * rate : item.monthlyCost;
      const identityLine = [item.brand, item.model].filter(Boolean).join(" ");

      return `
        <article class="appliance-item">
          <div class="appliance-item-header">
            <div>
              <h3>${item.name}</h3>
              <p class="appliance-subtitle">${identityLine || "Manual appliance entry"}</p>
            </div>

            <button
              type="button"
              class="remove-appliance-btn text-button"
              data-id="${item.id}"
              aria-label="Remove ${item.name}"
            >
              Remove
            </button>
          </div>

          <div class="appliance-meta">
            <div>
              <span class="meta-label">Category</span>
              <strong>${item.category}</strong>
            </div>
            <div>
              <span class="meta-label">Watts</span>
              <strong>${item.watts}</strong>
            </div>
            <div>
              <span class="meta-label">Monthly kWh</span>
              <strong>${item.monthlyKwh.toFixed(2)}</strong>
            </div>
            <div>
              <span class="meta-label">Monthly Cost</span>
              <strong>$${currentMonthlyCost.toFixed(2)}</strong>
            </div>
            <div>
              <span class="meta-label">Usage</span>
              <strong>${item.hoursPerDay} hrs/day · ${item.daysPerWeek} days/week</strong>
            </div>
            <div>
              <span class="meta-label">Quantity</span>
              <strong>${item.quantity}</strong>
            </div>
          </div>

          ${item.notes ? `<p class="appliance-note"><strong>Notes:</strong> ${item.notes}</p>` : ""}
        </article>
      `;
    })
    .join("");
}
function initializeDashboardPage() {
  const dashboardRate = document.getElementById("dashboard-rate");
  const dashboardApplianceCount = document.getElementById("dashboard-appliance-count");
  const dashboardTotalKwh = document.getElementById("dashboard-total-kwh");
  const dashboardTotalCost = document.getElementById("dashboard-total-cost");
  const dashboardStatusBanner = document.getElementById("dashboard-status-banner");
  const topCostDriver = document.getElementById("top-cost-driver");
  const highImpactList = document.getElementById("high-impact-list");
  const dashboardApplianceList = document.getElementById("dashboard-appliance-list");

  if (
    !dashboardRate ||
    !dashboardApplianceCount ||
    !dashboardTotalKwh ||
    !dashboardTotalCost ||
    !dashboardStatusBanner ||
    !topCostDriver ||
    !highImpactList ||
    !dashboardApplianceList
  ) {
    return;
  }

  const rate = getSavedRate();
  const appliances = getStoredAppliances();

  updateDashboardStatusBanner(dashboardStatusBanner, rate, appliances);
  renderDashboardSummary(rate, appliances, {
    dashboardRate,
    dashboardApplianceCount,
    dashboardTotalKwh,
    dashboardTotalCost
  });

  renderTopCostDriver(topCostDriver, appliances, rate);
  renderHighImpactAppliances(highImpactList, appliances, rate);
  renderDashboardApplianceList(dashboardApplianceList, appliances, rate);
}

function updateDashboardStatusBanner(banner, rate, appliances) {
  if (!rate && appliances.length === 0) {
    banner.className = "rate-banner warning-banner";
    banner.innerHTML = `
      <strong>No saved rate or appliances found.</strong>
      Start with <a href="rate.html" class="warning-link">Step 1: Rate</a>, then add appliances.
    `;
    return;
  }

  if (!rate) {
    banner.className = "rate-banner warning-banner";
    banner.innerHTML = `
      <strong>No electricity rate found.</strong>
      Go to <a href="rate.html" class="warning-link">Step 1: Rate</a> before trusting cost estimates.
    `;
    return;
  }

  if (appliances.length === 0) {
    banner.className = "rate-banner warning-banner";
    banner.innerHTML = `
      <strong>No tracked appliances found.</strong>
      Go to <a href="appliances.html" class="warning-link">Appliances</a> to add your major loads.
    `;
    return;
  }

  banner.className = "rate-banner success-banner";
  banner.innerHTML = `
    <strong>Dashboard ready:</strong> using a saved rate of $${rate.toFixed(4)} per kWh across ${appliances.length} tracked appliance(s).
  `;
}

function renderDashboardSummary(rate, appliances, refs) {
  const totalMonthlyKwh = appliances.reduce((sum, appliance) => {
    return sum + (Number(appliance.monthlyKwh) || 0);
  }, 0);

  const totalMonthlyCost = rate ? totalMonthlyKwh * rate : null;

  refs.dashboardRate.textContent = rate ? `$${rate.toFixed(4)} / kWh` : "Not set";
  refs.dashboardApplianceCount.textContent = appliances.length.toString();
  refs.dashboardTotalKwh.textContent = totalMonthlyKwh.toFixed(2);
  refs.dashboardTotalCost.textContent = rate ? `$${totalMonthlyCost.toFixed(2)}` : "Save rate first";
}

function renderTopCostDriver(container, appliances, rate) {
  if (!appliances.length || !rate) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Add a rate and at least one appliance to identify the top cost driver.</p>
      </div>
    `;
    return;
  }

  const rankedAppliances = appliances
    .map(appliance => ({
      ...appliance,
      currentMonthlyCost: (Number(appliance.monthlyKwh) || 0) * rate
    }))
    .sort((a, b) => b.currentMonthlyCost - a.currentMonthlyCost);

  const topAppliance = rankedAppliances[0];

  container.innerHTML = `
    <article class="highlight-card">
      <h4>${topAppliance.name}</h4>
      <p class="highlight-subtitle">${topAppliance.category}</p>

      <div class="highlight-metrics">
        <div>
          <span class="meta-label">Monthly kWh</span>
          <strong>${Number(topAppliance.monthlyKwh).toFixed(2)}</strong>
        </div>
        <div>
          <span class="meta-label">Monthly Cost</span>
          <strong>$${topAppliance.currentMonthlyCost.toFixed(2)}</strong>
        </div>
        <div>
          <span class="meta-label">Usage</span>
          <strong>${topAppliance.hoursPerDay} hrs/day · ${topAppliance.daysPerWeek} days/week</strong>
        </div>
      </div>
    </article>
  `;
}

function renderHighImpactAppliances(container, appliances, rate) {
  if (!appliances.length || !rate) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No high-impact appliances can be shown yet.</p>
      </div>
    `;
    return;
  }

  const highImpactAppliances = appliances
    .map(appliance => ({
      ...appliance,
      currentMonthlyCost: (Number(appliance.monthlyKwh) || 0) * rate
    }))
    .filter(appliance => appliance.currentMonthlyCost >= 5)
    .sort((a, b) => b.currentMonthlyCost - a.currentMonthlyCost);

  if (!highImpactAppliances.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No tracked appliances are currently estimated above $5 per month.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = highImpactAppliances
    .map(appliance => {
      return `
        <article class="compact-appliance-card">
          <div>
            <h4>${appliance.name}</h4>
            <p class="appliance-subtitle">${appliance.category}</p>
          </div>
          <strong>$${appliance.currentMonthlyCost.toFixed(2)}/mo</strong>
        </article>
      `;
    })
    .join("");
}

function renderDashboardApplianceList(container, appliances, rate) {
  if (!appliances.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No appliances have been added yet. Go to the Appliances page to start building your list.</p>
      </div>
    `;
    return;
  }

  const sortedAppliances = appliances
    .map(appliance => ({
      ...appliance,
      currentMonthlyCost: rate ? (Number(appliance.monthlyKwh) || 0) * rate : null
    }))
    .sort((a, b) => {
      const costA = a.currentMonthlyCost || 0;
      const costB = b.currentMonthlyCost || 0;
      return costB - costA;
    });

  container.innerHTML = sortedAppliances
    .map(appliance => {
      return `
        <article class="dashboard-appliance-row">
          <div class="dashboard-appliance-main">
            <h4>${appliance.name}</h4>
            <p class="appliance-subtitle">${appliance.category}</p>
          </div>

          <div class="dashboard-appliance-metrics">
            <div>
              <span class="meta-label">Monthly kWh</span>
              <strong>${Number(appliance.monthlyKwh).toFixed(2)}</strong>
            </div>
            <div>
              <span class="meta-label">Monthly Cost</span>
              <strong>${rate ? `$${appliance.currentMonthlyCost.toFixed(2)}` : "Save rate first"}</strong>
            </div>
            <div>
              <span class="meta-label">Quantity</span>
              <strong>${appliance.quantity}</strong>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}
