// API configuration
const API_URL = "https://sheetdb.io/api/v1/7r7twc7z553jo";
const DISH_COLUMN = "Prato";

// Constants
const MAX_DISHES = 11;
const DAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo"
];
const POSITIONS = [
  "21%",
  "27.5%",
  "34%",
  "40.5%",
  "47%",
  "53.5%",
  "60%",
  "66.5%",
  "73%",
  "79.5%",
  "86%"
];

// Global state
let dishes = [];
let cardapioPorDia = {
  Segunda: [],
  Terça: [],
  Quarta: [],
  Quinta: [],
  Sexta: [],
  Sábado: [],
  Domingo: []
};
let selectedDay = "Segunda";
let isLoading = false;
let syncStatus = "idle"; // idle, loading, success, error
let toastTimeout = null;

// DOM Elements
const newDishInput = document.getElementById("new-dish");
const addDishBtn = document.getElementById("add-dish-btn");
const refreshBtn = document.getElementById("refresh-btn");
const clearMenuBtn = document.getElementById("clear-menu-btn");
const exportBtn = document.getElementById("export-btn");
const statusBadge = document.getElementById("status-badge");
const daySelector = document.getElementById("day-selector");
const dishesList = document.getElementById("dishes-list");
const selectedDishesList = document.getElementById("selected-dishes-list");
const errorMessage = document.getElementById("error-message");
const selectedCount = document.getElementById("selected-count");
const menuDay = document.getElementById("menu-day");
const menuDishes = document.getElementById("menu-dishes");
const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toast-title");
const toastMessage = document.getElementById("toast-message");

// Initialize the app
function init() {
  // Load data from localStorage
  loadFromLocalStorage();

  // Initialize UI
  renderDaySelector();
  renderMenuPreview();
  updateSelectedCount();
  updateSyncStatus();

  // Fetch dishes from API
  refreshDishes();

  // Event listeners
  addDishBtn.addEventListener("click", handleAddDish);
  newDishInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAddDish();
  });
  refreshBtn.addEventListener("click", refreshDishes);
  clearMenuBtn.addEventListener("click", clearMenu);
  exportBtn.addEventListener("click", handleExport);
}

// Load data from localStorage
function loadFromLocalStorage() {
  const storedDishes = localStorage.getItem("baseDePratos");
  const storedCardapio = localStorage.getItem("cardapioPorDia");

  if (storedDishes) {
    dishes = JSON.parse(storedDishes);
  }

  if (storedCardapio) {
    cardapioPorDia = JSON.parse(storedCardapio);
  }
}

// Save data to localStorage
function saveToLocalStorage() {
  localStorage.setItem("baseDePratos", JSON.stringify(dishes));
  localStorage.setItem("cardapioPorDia", JSON.stringify(cardapioPorDia));
}

// Render the day selector
function renderDaySelector() {
  daySelector.innerHTML = "";

  DAYS.forEach((day) => {
    const btn = document.createElement("button");
    btn.textContent = day.slice(0, 3);
    btn.className = `day-btn ${day === selectedDay ? "active" : ""}`;
    btn.addEventListener("click", () => {
      setSelectedDay(day);
    });

    daySelector.appendChild(btn);
  });
}

// Render the dishes list
function renderDishesLists() {
  renderDishList();
  renderSelectedDishList();
  updateSelectedCount();
}

// Render the main dish list
function renderDishList() {
  if (dishes.length === 0) {
    dishesList.innerHTML = `<div class="empty-dish">Nenhum prato disponível</div>`;
    return;
  }

  dishesList.innerHTML = "";

  dishes.forEach((dish, index) => {
    const isSelected = cardapioPorDia[selectedDay].includes(dish);
    const selectedIndex = cardapioPorDia[selectedDay].indexOf(dish);

    const dishItem = createDishItem(
      dish,
      index,
      false,
      isSelected,
      selectedIndex
    );
    dishesList.appendChild(dishItem);
  });
}

// Render the selected dish list
function renderSelectedDishList() {
  const selectedDishes = cardapioPorDia[selectedDay];

  if (selectedDishes.length === 0) {
    selectedDishesList.innerHTML = `<div class="empty-dish">Nenhum prato selecionado</div>`;
    return;
  }

  selectedDishesList.innerHTML = "";

  selectedDishes.forEach((dish, index) => {
    const dishItem = createDishItem(dish, index, true, true, -1);
    selectedDishesList.appendChild(dishItem);
  });
}

// Create a dish item element
function createDishItem(
  dish,
  index,
  isSelected,
  isAddedToSelection,
  selectedIndex
) {
  const dishItem = document.createElement("div");
  dishItem.className = "dish-item";
  dishItem.draggable = true;
  dishItem.dataset.index = index;
  dishItem.dataset.dish = dish;

  // Handle drag events
  dishItem.addEventListener("dragstart", handleDragStart);
  dishItem.addEventListener("dragover", handleDragOver);
  dishItem.addEventListener("drop", handleDrop);

  // Dish content
  const dishContent = document.createElement("div");
  dishContent.className = "dish-content";

  const nameSpan = document.createElement("span");
  nameSpan.className = "dish-name";
  nameSpan.textContent = dish;
  dishContent.appendChild(nameSpan);

  // Show checkmark if dish is added to selection but not in selected list
  if (isAddedToSelection && !isSelected) {
    const checkSpan = document.createElement("span");
    checkSpan.className = "dish-check";
    checkSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    dishContent.appendChild(checkSpan);
  }

  dishItem.appendChild(dishContent);

  // Dish actions
  const actions = document.createElement("div");
  actions.className = "dish-actions";

  // Add button (only for main list)
  if (!isSelected) {
    const addBtn = document.createElement("button");
    addBtn.className = `btn btn-sm btn-icon ${
      isAddedToSelection ? "btn-info" : "btn-success"
    }`;
    addBtn.disabled = isAddedToSelection;
    addBtn.title = isAddedToSelection ? "Já adicionado" : "Adicionar à seleção";
    addBtn.innerHTML = isAddedToSelection
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;

    addBtn.addEventListener("click", () => {
      addToMenu(dish);
    });

    actions.appendChild(addBtn);
  }

  // Position indicator and remove button wrapper
  const removeWrapper = document.createElement("div");
  removeWrapper.style.display = "flex";
  removeWrapper.style.alignItems = "center";
  removeWrapper.style.gap = "4px";

  // Position badge (only for selected list)
  if (isSelected) {
    const positionBadge = document.createElement("span");
    positionBadge.className = "position-badge";
    positionBadge.textContent = `${index + 1}/${MAX_DISHES}`;
    removeWrapper.appendChild(positionBadge);
  }

  // Remove/delete button
  const removeBtn = document.createElement("button");
  removeBtn.className = "btn btn-sm btn-icon btn-danger";

  removeBtn.innerHTML = isSelected
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

  removeBtn.addEventListener("click", () => {
    if (isSelected) {
      removeFromMenu(index);
    } else {
      removeDish(index);
    }
  });

  removeWrapper.appendChild(removeBtn);
  actions.appendChild(removeWrapper);

  // Drag handle
  const dragHandle = document.createElement("button");
  dragHandle.className = "btn btn-sm btn-icon";
  dragHandle.style.cursor = "grab";
  dragHandle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`;
  actions.appendChild(dragHandle);

  dishItem.appendChild(actions);

  return dishItem;
}

// Render the menu preview
function renderMenuPreview() {
  // Set day text
  const formattedDay = formatDay(selectedDay);
  menuDay.textContent = formattedDay;

  // Clear previous dishes
  menuDishes.innerHTML = "";

  // Create dish elements at their positions
  const selectedDishes = cardapioPorDia[selectedDay];

  POSITIONS.forEach((position, index) => {
    if (index < MAX_DISHES) {
      const dishEl = document.createElement("div");
      dishEl.className = "menu-dish";
      dishEl.style.top = position;
      dishEl.textContent =
        index < selectedDishes.length ? selectedDishes[index] : "";

      menuDishes.appendChild(dishEl);
    }
  });
}

// Format day for display
function formatDay(day) {
  if (day === "Sábado" || day === "Domingo") {
    return day;
  }
  return `${day}-feira`;
}

// Update the selected dishes count
function updateSelectedCount() {
  const count = cardapioPorDia[selectedDay].length;
  selectedCount.textContent = count;
}

// Update the sync status badge
function updateSyncStatus() {
  statusBadge.className = "badge";

  if (syncStatus === "loading") {
    statusBadge.classList.add("loading");
    statusBadge.textContent = "Sincronizando...";
  } else if (syncStatus === "error") {
    statusBadge.classList.add("error");
    statusBadge.textContent = "Erro de sincronização";
  } else if (syncStatus === "success") {
    statusBadge.classList.add("success");
    statusBadge.textContent = "Sincronizado";
  } else {
    statusBadge.textContent = "Status";
  }
}

// Fetch dishes from the API
async function refreshDishes() {
  isLoading = true;
  syncStatus = "loading";
  updateSyncStatus();
  errorMessage.classList.add("hidden");
  refreshBtn.disabled = true;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    const data = await response.json();

    // Extract dish names and filter out empty values
    const apiDishes = data.map((item) => item[DISH_COLUMN]).filter(Boolean);

    // Merge with local dishes, avoiding duplicates
    const allDishes = [...dishes, ...apiDishes];
    dishes = allDishes.filter(
      (dish, index) => allDishes.indexOf(dish) === index
    );

    // Save to localStorage
    saveToLocalStorage();

    // Update UI
    renderDishesLists();

    syncStatus = "success";

    // Auto-hide success status after 3 seconds
    setTimeout(() => {
      syncStatus = "idle";
      updateSyncStatus();
    }, 3000);

    showToast(
      "Sincronização concluída",
      "Pratos atualizados com sucesso.",
      "success"
    );
  } catch (err) {
    syncStatus = "error";
    errorMessage.classList.remove("hidden");
    errorMessage.textContent = `Erro ao carregar pratos: ${err.message}`;

    showToast(
      "Erro de sincronização",
      "Não foi possível obter os pratos da API.",
      "error"
    );
  } finally {
    isLoading = false;
    refreshBtn.disabled = false;
    updateSyncStatus();
  }
}

// Add a new dish to the list and API
async function addDish(dish) {
  if (!dish || !dish.trim()) {
    showToast("Prato vazio", "Digite o nome do prato para adicionar", "error");
    return;
  }

  const trimmedDish = dish.trim();

  if (dishes.includes(trimmedDish)) {
    showToast("Prato duplicado", "Este prato já existe na lista", "error");
    return;
  }

  isLoading = true;
  syncStatus = "loading";
  updateSyncStatus();
  addDishBtn.disabled = true;

  try {
    // Add to API first
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ [DISH_COLUMN]: trimmedDish })
    });

    // Then add locally if API call succeeded
    dishes.push(trimmedDish);
    saveToLocalStorage();
    renderDishesLists();

    syncStatus = "success";

    // Auto-hide success status after 3 seconds
    setTimeout(() => {
      syncStatus = "idle";
      updateSyncStatus();
    }, 3000);

    showToast("Prato adicionado", "Prato adicionado com sucesso.", "success");
  } catch (err) {
    syncStatus = "error";

    showToast(
      "Erro ao adicionar",
      "O prato foi salvo localmente, mas não foi sincronizado.",
      "error"
    );

    // Add locally anyway as fallback
    dishes.push(trimmedDish);
    saveToLocalStorage();
    renderDishesLists();
  } finally {
    isLoading = false;
    addDishBtn.disabled = false;
    updateSyncStatus();
    newDishInput.value = "";
  }
}

// Handle adding a new dish
function handleAddDish() {
  const dish = newDishInput.value;
  addDish(dish);
}

// Remove a dish from the list and API
async function removeDish(index) {
  const dishToRemove = dishes[index];
  if (!dishToRemove) return;

  isLoading = true;
  syncStatus = "loading";
  updateSyncStatus();

  try {
    // Delete from API first
    const encodedDish = encodeURIComponent(dishToRemove);
    const deleteUrl = `${API_URL}/${DISH_COLUMN}/${encodedDish}`;

    await fetch(deleteUrl, {
      method: "DELETE"
    });

    // Then remove locally if API call succeeded
    dishes.splice(index, 1);

    // Also remove from any day's menu
    Object.keys(cardapioPorDia).forEach((day) => {
      cardapioPorDia[day] = cardapioPorDia[day].filter(
        (d) => d !== dishToRemove
      );
    });

    saveToLocalStorage();
    renderDishesLists();
    renderMenuPreview();

    syncStatus = "success";

    // Auto-hide success status after 3 seconds
    setTimeout(() => {
      syncStatus = "idle";
      updateSyncStatus();
    }, 3000);

    showToast("Prato removido", "Prato removido com sucesso.", "success");
  } catch (err) {
    syncStatus = "error";

    showToast(
      "Erro ao remover",
      "O prato foi removido localmente, mas pode ainda existir no servidor.",
      "error"
    );

    // Remove locally anyway as fallback
    dishes.splice(index, 1);

    // Also remove from any day's menu
    Object.keys(cardapioPorDia).forEach((day) => {
      cardapioPorDia[day] = cardapioPorDia[day].filter(
        (d) => d !== dishToRemove
      );
    });

    saveToLocalStorage();
    renderDishesLists();
    renderMenuPreview();
  } finally {
    isLoading = false;
    updateSyncStatus();
  }
}

// Add a dish to the selected day's menu
function addToMenu(dish) {
  const dayDishes = cardapioPorDia[selectedDay];

  if (dayDishes.length < MAX_DISHES && !dayDishes.includes(dish)) {
    dayDishes.push(dish);
    saveToLocalStorage();
    renderDishesLists();
    renderMenuPreview();
    updateSelectedCount();

    showToast(
      "Prato adicionado ao menu",
      `"${dish}" foi adicionado ao menu de ${selectedDay}.`,
      "success"
    );
  } else if (dayDishes.includes(dish)) {
    showToast(
      "Prato já adicionado",
      "Este prato já está no menu do dia selecionado.",
      "error"
    );
  } else {
    showToast(
      "Menu cheio",
      `Você já atingiu o limite de ${MAX_DISHES} pratos.`,
      "error"
    );
  }
}

// Remove a dish from the selected day's menu
function removeFromMenu(index) {
  const dayDishes = cardapioPorDia[selectedDay];
  const removedDish = dayDishes[index];

  dayDishes.splice(index, 1);
  saveToLocalStorage();
  renderDishesLists();
  renderMenuPreview();
  updateSelectedCount();

  showToast(
    "Prato removido do menu",
    `"${removedDish}" foi removido do menu de ${selectedDay}.`,
    "success"
  );
}

// Clear all dishes from the selected day's menu
function clearMenu() {
  if (cardapioPorDia[selectedDay].length === 0) {
    showToast("Menu vazio", "Não há pratos para remover.", "error");
    return;
  }

  cardapioPorDia[selectedDay] = [];
  saveToLocalStorage();
  renderDishesLists();
  renderMenuPreview();
  updateSelectedCount();

  showToast(
    "Menu limpo",
    `Todos os pratos foram removidos do menu de ${selectedDay}.`,
    "success"
  );
}

// Set the selected day
function setSelectedDay(day) {
  selectedDay = day;
  renderDaySelector();
  renderDishesLists();
  renderMenuPreview();
}

// Handle exporting the menu as an image
async function handleExport() {
  const previewElement = document.getElementById("menu-preview");
  if (!previewElement) return;

  try {
    const canvas = await html2canvas(previewElement, { useCORS: true });
    const dataUrl = canvas.toDataURL("image/jpeg");

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `Cardapio-${selectedDay}.jpeg`;
    a.click();

    showToast(
      "Exportação concluída",
      "O cardápio foi exportado com sucesso.",
      "success"
    );
  } catch (err) {
    showToast(
      "Erro ao exportar",
      "Não foi possível exportar o cardápio.",
      "error"
    );
    console.error("Export error:", err);
  }
}

// Drag and drop functionality
let draggedItem = null;
let draggedList = null;

function handleDragStart(e) {
  draggedItem = e.target;
  draggedList = draggedItem.parentElement;
  draggedItem.classList.add("dragging");

  // Store data for transfer
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", draggedItem.dataset.index);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function handleDrop(e) {
  e.preventDefault();
  const dropTarget = e.target.closest(".dish-item");
  draggedItem.classList.remove("dragging");

  // Only process drop if it's on a different item and it's in the same list
  if (
    dropTarget &&
    dropTarget !== draggedItem &&
    dropTarget.parentElement === draggedList
  ) {
    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(dropTarget.dataset.index);

    // Handle reordering based on which list it is
    const isSameList =
      draggedList === dishesList || draggedList === selectedDishesList;

    if (isSameList) {
      if (draggedList === dishesList) {
        // Reorder main dishes list
        reorderDishes(fromIndex, toIndex);
      } else if (draggedList === selectedDishesList) {
        // Reorder selected dishes list
        reorderSelectedDishes(fromIndex, toIndex);
      }
    }
  }

  draggedItem = null;
  draggedList = null;
}

// Reorder dishes in the main dish list
function reorderDishes(fromIndex, toIndex) {
  const [removed] = dishes.splice(fromIndex, 1);
  dishes.splice(toIndex, 0, removed);
  saveToLocalStorage();
  renderDishesLists();
}

// Reorder dishes in the selected day's menu
function reorderSelectedDishes(fromIndex, toIndex) {
  const dayDishes = cardapioPorDia[selectedDay];
  const [removed] = dayDishes.splice(fromIndex, 1);
  dayDishes.splice(toIndex, 0, removed);
  saveToLocalStorage();
  renderDishesLists();
  renderMenuPreview();
}

// Show a toast message
function showToast(title, message, type = "success") {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toast.className = "toast";
  toast.classList.add(`toast-${type}`);
  toastTitle.textContent = title;
  toastMessage.textContent = message;

  toast.classList.remove("hidden");

  toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", init);
