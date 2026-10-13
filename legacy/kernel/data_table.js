/**
 * Generic Data Table Component
 * Completely agnostic - doesn't know business logic
 * Just displays what the API sends
 */

let tableData = [];
let headers = [];
let rows = [];
let per_page = 10;
let pageNo = 1;
let tableCount = 0;
let pagination = { page: 1, total: 0, per_page: 10 };
let apiUrlDefault = "/api/endpoint";
let paramsDefault = {};
let withSelectionDefault = false;
let primaryKeyDefault = 'id';
let selectedItems = new Set();
let onSelectionChangeDefault = null;
let customRenderersDefault = {};
let selectableIdsDefault = null;
let getPaginationInfoDefault = null; // ✅ Add this

/**
 * Generic API call - sends params as-is
 * @param {object} customRenderers - Optional: { columnKey: (value, row) => html }
 * @param {Set|Array} selectableIds - Optional: Set/Array of IDs that can be selected (if null, all are selectable)
 * @param {function} getPaginationInfo - Optional: (pagination, params) => { total, info } to customize display
 */
async function createTable(apiUrl, params, headersArg, rowsArg, withSelection = false, primaryKey = 'id', onSelectionChange = null, customRenderers = {}, selectableIds = null, getPaginationInfo = null) {
    apiUrlDefault = apiUrl;
    paramsDefault = JSON.parse(JSON.stringify(params));
    withSelectionDefault = withSelection;
    primaryKeyDefault = primaryKey;
    customRenderersDefault = customRenderers || {};
    selectableIdsDefault = selectableIds ? (selectableIds instanceof Set ? selectableIds : new Set(selectableIds)) : null;
    getPaginationInfoDefault = getPaginationInfo; // ✅ Store it
    if (onSelectionChange) onSelectionChangeDefault = onSelectionChange;

    if (headersArg) headers = headersArg;
    if (rowsArg) rows = rowsArg;

    if (!headers?.length || !rows?.length) {
        showAlert('danger', 'Table configuration error');
        return null;
    }

    // Extract per_page for internal use (but don't modify params)
    if (params.per_page) per_page = params.per_page;

    console.log("📤 TABLE SENDING:", JSON.stringify(params, null, 2));

    showLoadingIndicator();

    try {
        let cleanApiUrl = apiUrl.replace(/^\/+|\/+$/g, '');
        if (cleanApiUrl.startsWith('api/')) cleanApiUrl = cleanApiUrl.substring(4);
        const fullUrl = `/api/${cleanApiUrl}`;

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        console.log("✅ TABLE RECEIVED:", data);

        let actualData = Array.isArray(data.data) ? data.data : data.data?.data || [];
        let actualPagination = data.pagination || data.data?.pagination;

        if (!Array.isArray(actualData)) throw new Error("Invalid data format");

        tableData = actualData;

        // ✅ Keep FULL pagination from API (including 'filtered')
        pagination = actualPagination || {
            page: params.page || 1,
            total: actualData.length,
            per_page: per_page
        };

        tableCount = pagination.total;
        pageNo = pagination.page;

        hideLoadingIndicator();
        TableComponent(tableData, headers, rows, actualPagination, "", withSelection, primaryKey, onSelectionChangeDefault, customRenderersDefault, selectableIdsDefault, getPaginationInfoDefault);

        return { success: true, data: actualData, pagination: actualPagination };

    } catch (error) {
        console.error("❌ TABLE ERROR:", error);
        hideLoadingIndicator();
        showAlert('danger', error.message || 'Failed to load');

        const container = document.querySelector("#table-container");
        if (container) {
            container.innerHTML = `<div class="bg-white dark:bg-gray-800 text-red-500 dark:text-red-400 rounded-lg p-8 shadow-lg text-center border border-gray-100 dark:border-gray-700"><h3 class="text-lg font-medium text-red-600 dark:text-red-500">Error Loading Data</h3><p class="text-sm text-gray-600 dark:text-gray-400">${error.message}</p><button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Retry</button></div>`;
        }
        return { success: false, error: error.message };
    }
}

// Helper functions
function getSelectedItems() { return Array.from(selectedItems); }
function getSelectedCount() { return selectedItems.size; }
function isItemSelected(id) { return selectedItems.has(String(id)); }

function clearSelectedItems() {
    selectedItems.clear();
    const cb = document.querySelector("#select-all");
    if (cb) { cb.checked = false; cb.indeterminate = false; }
    document.querySelectorAll(".row-checkbox").forEach(c => c.checked = false);
    if (onSelectionChangeDefault) onSelectionChangeDefault(selectedItems);
}

function selectItems(ids) {
    if (!Array.isArray(ids)) return;
    ids.forEach(id => selectedItems.add(String(id)));
    document.querySelectorAll(".row-checkbox").forEach(cb => {
        if (ids.includes(cb.value) || ids.includes(Number(cb.value))) cb.checked = true;
    });
    if (onSelectionChangeDefault) onSelectionChangeDefault(selectedItems);
}

function showLoadingIndicator() {
    const c = document.querySelector("#table-container");
    if (!c) return;
    const skeletonRow = `<div class="flex items-center gap-4 px-4 py-3.5"><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-10 animate-pulse"></div><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-32 animate-pulse"></div><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-24 animate-pulse"></div><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-28 animate-pulse"></div></div>`;
    const headerSkeleton = `<div class="flex items-center gap-4 px-4 py-3 border-b-2 border-gray-200 dark:border-gray-600"><div class="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-8 animate-pulse"></div><div class="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-24 animate-pulse"></div><div class="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-16 animate-pulse"></div><div class="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-20 animate-pulse"></div><div class="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-14 animate-pulse"></div><div class="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-24 animate-pulse"></div></div>`;
    let rows = '';
    for (let i = 0; i < 6; i++) {
        const opacity = 1 - (i * 0.12);
        rows += `<div style="opacity:${opacity}" class="${i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-700/10' : ''}">${skeletonRow}</div>`;
    }
    c.innerHTML = `<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">${headerSkeleton}<div class="divide-y divide-gray-100 dark:divide-gray-700/50">${rows}</div><div class="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-700"><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-36 animate-pulse"></div><div class="flex gap-1.5"><div class="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div><div class="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div><div class="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div></div></div></div>`;
}

function hideLoadingIndicator() {}

function showAlert(type, message) {
    const typeMap = { d: 'danger', s: 'success', w: 'warning', i: 'info' };
    const t = typeMap[type] || type;
    const colors = {
        success: 'bg-green-100 dark:bg-green-900/80 border-green-400 dark:border-green-800 text-green-700 dark:text-green-200',
        danger: 'bg-red-100 dark:bg-red-900/80 border-red-400 dark:border-red-800 text-red-700 dark:text-red-100',
        warning: 'bg-yellow-100 dark:bg-yellow-900/80 border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-200',
        info: 'bg-blue-100 dark:bg-blue-900/80 border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-200'
    };
    const el = document.createElement('div');
    el.className = `fixed top-6  left-10 min-w-[300px] z-[99999] ${colors[t]} border px-4 py-3 rounded-lg shadow-lg max-w-md `;
    el.innerHTML = `<div class="flex items-center justify-between"><span>${message}</span><button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">&times;</button></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

async function refreshTable() {
    return await createTable(apiUrlDefault, paramsDefault, headers, rows, withSelectionDefault, primaryKeyDefault, onSelectionChangeDefault);
}

/**
 * Table Component - renders UI and handles interactions
 * Pure presentation - just displays what it receives
 * @param {object} customRenderers - Optional: { columnKey: (value, row) => html }
 * @param {Set} selectableIds - Optional: Set of IDs that are selectable
 * @param {function} getPaginationInfo - Optional: callback to customize pagination display
 */
function TableComponent(data, columns, rowNames, paginationData, actions = "", withSelection = false, primaryKey = 'id', onSelectionChange = null, customRenderers = {}, selectableIds = null, getPaginationInfo = null) {
    headers = columns;
    rows = rowNames;
    primaryKeyDefault = primaryKey;
    withSelectionDefault = withSelection;
    pagination = paginationData;
    if (onSelectionChange) onSelectionChangeDefault = onSelectionChange;
    if (typeof selectedItems === 'undefined') selectedItems = new Set();

    let tableContent = [...data];
    let currentSort = { key: null, asc: true };

    // ✅ Let parent decide what to display via callback
    let displayTotal, infoText;
    if (getPaginationInfo && typeof getPaginationInfo === 'function') {
        console.log("🎨 Using custom pagination info callback");
        const customInfo = getPaginationInfo(paginationData, paramsDefault);
        displayTotal = customInfo.total;
        infoText = customInfo.info;
        console.log("📊 Custom info:", customInfo);
    } else {
        console.log("📊 Using default pagination info");
        // Default behavior
        displayTotal = paginationData.total || data.length || 0;
        const safePage = paginationData.page || 1;
        const safePerPage = per_page || 10;
        const firstNumber = safePage === 1 ? 1 : 1 + safePerPage * (safePage - 1);
        const lastItemNumber = Math.min(safePerPage * safePage, displayTotal);
        infoText = `<span>${firstNumber} to ${lastItemNumber}</span> of <span>${displayTotal}</span>`;
    }

    const safeTotal = displayTotal;
    const safePage = paginationData.page || 1;
    const safePerPage = per_page || 10;

    const container = document.querySelector("#table-container");
    if (!container) return;

    const checkboxHeader = withSelection ? `<th class="w-10 pl-4 py-3 bg-white dark:bg-gray-800"><input type="checkbox" id="select-all" class="rounded border-gray-300 dark:border-gray-600 text-blue-600 w-4 h-4 cursor-pointer bg-white dark:bg-gray-700"></th>` : '';

    container.innerHTML = `
    <div class="table-container bg-white dark:bg-gray-800 rounded-lg py-4 shadow-lg border border-gray-100 dark:border-gray-700">
        <div class="tableHeader flex flex-wrap justify-between items-center mb-4 gap-4 px-3">
        <!-- Optional: Container for custom filters (controlled by parent page) -->
        <div id="table-custom-filters" class="flex-1 flex justify-start"></div>
            <div class="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-100 dark:border-gray-600/50">
                <button class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm" id="export-csv"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>CSV</button>
                <button class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm" id="export-excel"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-1.5m1.5 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c0 .621-.504 1.125-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m0 0h-1.5m10.875 0c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125"/></svg>Excel</button>
                <button class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-red-500 dark:hover:bg-red-500 hover:text-white hover:border-red-500 dark:hover:border-red-500 transition-all text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-md shadow-sm" id="export-pdf"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>PDF</button>
            </div>
            
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full">
                <thead>
                    <tr class="border-b-2 border-gray-200 dark:border-gray-600">
                        ${checkboxHeader}
                        ${columns.map(col => `<th data-key="${col.toLowerCase()}" class="pr-6 pl-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 cursor-pointer  dark:bg-gray-800/80 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors select-none"><span class="flex items-center gap-1">${col}<span class="ml-1 flex flex-col gap-0.5 opacity-40"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-2.5 rotate-[270deg] text-blue-500 dark:text-white  up"><path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.531l-6.706 4.268A1.5 1.5 0 0 1 3 12.267V3.732Z"/></svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-2.5 rotate-90 text-blue-500 dark:text-white down"><path d="M3 3.732a1.5 1.5 0 0 1 2.305-1.265l6.706 4.267a1.5 1.5 0 0 1 0 2.531l-6.706 4.268A1.5 1.5 0 0 1 3 12.267V3.732Z"/></svg></span></span></th>`).join('')}
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 "></tbody>
            </table>
        </div>
        <footer class="pt-4 p-5 flex flex-wrap justify-between items-center gap-4 border-t border-gray-100 dark:border-gray-700">
            <div class="grid grid-cols-2 gap-3">
                <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg px-3 py-1.5 h-full border border-gray-200 dark:border-gray-600/50 text-sm text-gray-600 dark:text-gray-300">${infoText}</div>
                <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-600/50 w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-400 dark:text-gray-500"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
                    <span class="text-xs text-gray-400 dark:text-gray-500">Rows</span>
                    <select class="form-group-select h-7 pl-1.5 pr-5 rounded-md border border-gray-200 dark:border-gray-600 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all outline-none appearance-none" style="background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b7280%22><path fill-rule=%22evenodd%22 d=%22M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z%22 clip-rule=%22evenodd%22/></svg>');background-repeat:no-repeat;background-position:right 2px center;background-size:14px">
                        <option value="10" ${safePerPage == 10 ? "selected" : ""}>10</option>
                        <option value="25" ${safePerPage == 25 ? "selected" : ""}>25</option>
                        <option value="50" ${safePerPage == 50 ? "selected" : ""}>50</option>
                        <option value="100" ${safePerPage == 100 ? "selected" : ""}>100</option>
                    </select>
                </div>
            </div>
            <nav><ul class="pagination flex flex-wrap items-center gap-1" id="pagination"></ul></nav>
        </footer>
    </div>`;

    const tbody = container.querySelector("tbody");
    const headersElements = container.querySelectorAll("th[data-key]");
    const paginationContainer = document.getElementById("pagination");
    const per_pageSelect = document.querySelector(".form-group-select");

    /**
     * Generic event that parent can listen to
     * Emits custom event with action type and value
     */
    function triggerTableEvent(action, value) {
        const sourceContainerId = container && container.id ? container.id : null;
        const event = new CustomEvent('tableAction', {
            detail: { action, value, currentParams: paramsDefault, tableContainerId: sourceContainerId }
        });
        document.dispatchEvent(event);
        console.log("🔔 Table Event:", action, value, sourceContainerId);
    }

    // Pagination
    async function updatePage(pageNumber) {
        triggerTableEvent('pageChange', pageNumber);
    }

    function renderPagination() {
        paginationContainer.innerHTML = "";
        const totalPages = Math.ceil(safeTotal / safePerPage) || 1;
        if (totalPages <= 1) return;

        const chevronLeft = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>`;
        const chevronRight = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>`;
        const doubleChevronLeft = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m18.75 19.5-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"/></svg>`;
        const doubleChevronRight = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5"/></svg>`;

        const arrowClass = "flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-blue-500 hover:border-blue-500 hover:text-white dark:hover:bg-blue-500 dark:hover:border-blue-500 dark:hover:text-white transition-all cursor-pointer";
        const pageClass = "flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer";
        const activeClass = "flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg text-sm font-semibold bg-blue-500 text-white shadow-md shadow-blue-500/30 cursor-default";
        const disabledClass = " opacity-50  cursor-not-allowed";

        function addNavBtn(svg, page, disabled) {
            const li = document.createElement("li");
            li.innerHTML = `<span class="${arrowClass}${disabled ? disabledClass : ''}">${svg}</span>`;
            if (!disabled) li.onclick = () => updatePage(page);
            paginationContainer.appendChild(li);
        }

        // << First
        addNavBtn(doubleChevronLeft, 1, safePage <= 1);
        // < Prev
        addNavBtn(chevronLeft, safePage - 1, safePage <= 1);

        // Page numbers - sliding window
        const maxVisible = 7;
        let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

        for (let i = start; i <= end; i++) {
            const li = document.createElement("li");
            if (safePage === i) {
                li.innerHTML = `<span class="${activeClass}">${i}</span>`;
            } else {
                li.innerHTML = `<span class="${pageClass}">${i}</span>`;
                li.onclick = () => updatePage(i);
            }
            paginationContainer.appendChild(li);
        }

        // > Next
        addNavBtn(chevronRight, safePage + 1, safePage >= totalPages);
        // >> Last
        addNavBtn(doubleChevronRight, totalPages, safePage >= totalPages);

        // Page jump input
        if (totalPages > 1) {
            const jumpLi = document.createElement("li");
            jumpLi.className = "ml-2 flex items-center gap-1.5";
            jumpLi.innerHTML = `<input type="number" min="1" max="${totalPages}" value="${safePage}" class="w-12 h-9 text-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"><span class="text-xs text-gray-400 dark:text-gray-500">/ ${totalPages}</span>`;
            const input = jumpLi.querySelector('input');
            input.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    const val = Math.min(Math.max(1, parseInt(this.value) || 1), totalPages);
                    if (val !== safePage) updatePage(val);
                    else this.value = safePage;
                }
            };
            input.onblur = function() { this.value = safePage; };
            paginationContainer.appendChild(jumpLi);
        }
    }

    function renderRows(rowsData) {
        if (!rowsData?.length) {
            tbody.innerHTML = `<tr><td colspan="${columns.length + (withSelection ? 1 : 0)}" class="py-16 text-center"><div class="flex flex-col items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-12 h-12 text-gray-300 dark:text-gray-600"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.75 7.5h16.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg><p class="text-sm font-medium text-gray-400 dark:text-gray-500">No data found</p><p class="text-xs text-gray-300 dark:text-gray-600">Try adjusting your filters or search criteria</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rowsData.map((row, idx) => {
            const rowId = row[primaryKey];
            const isSelected = selectedItems.has(String(rowId));
            const stripe = idx % 2 === 1 ? 'bg-gray-100 dark:bg-gray-700/20' : '';
            const rowClass = isSelected ? 'bg-blue-100 dark:bg-blue-900/20' : stripe;

            // ✅ Check if this specific ID is in the selectable list
            const isSelectable = !selectableIds || selectableIds.has(String(rowId));

            const checkboxCell = withSelection ? `
                <td class="pl-4">
                    ${isSelectable
                ? `<input type="checkbox" class="row-checkbox rounded border-gray-300 dark:border-gray-600 text-blue-600 w-4 h-4 cursor-pointer bg-white dark:bg-gray-700" value="${rowId}" ${isSelected ? 'checked' : ''}>`
                : `<span class="text-gray-300 dark:text-gray-600 text-xs">—</span>`
            }
                </td>` : '';

            const cells = rowNames.map(key => {
                let v = row[key];



                // ✅ Check if there's a custom renderer for this column
                if (customRenderers && customRenderers[key]) {
                    const customHtml = customRenderers[key](v, row);
                    return `<td class="pl-3">${customHtml}</td>`;
                }

                // ⚠️ Default rendering (fallback only)

                // Status Badge - basic red/green only
                if (key.toLowerCase().includes("status")) {
                    const statusClass = v?.toLowerCase() === 'active' ? "bg-green-600" : "bg-red-600";
                    return `<td><span class="${statusClass} text-white px-3 py-1 rounded-lg text-xs font-medium">${v || 'N/A'}</span></td>`;
                }

                // Empty values
                if (v === undefined || v === null || v === "") {
                    return `<td><span class="text-gray-400 italic text-sm">empty</span></td>`;
                }

                // Images
                if (key === "image" || key === "icon") {
                    return `<td><img src="${v}" class="w-12 h-12 object-cover rounded"/></td>`;
                }

                // Long text (like session IDs)
                if (key.toLowerCase().includes("session") && v.length > 15) {
                    return `<td title="${v}" class="text-sm font-mono">${v.substring(0,12)}...</td>`;
                }

                return `<td class="pl-3 text-sm">${v}</td>`;
            }).join("");

            return `<tr class="${rowClass} transition-colors duration-150 hover:bg-blue-200/50 dark:hover:bg-blue-900/20">${checkboxCell}${cells}</tr>`;
        }).join("");

        if (withSelection) {
            const all = container.querySelectorAll(".row-checkbox");
            const allChecked = Array.from(all).every(c => c.checked);
            const some = Array.from(all).some(c => c.checked);
            const sel = container.querySelector("#select-all");
            if (sel) { sel.checked = allChecked; sel.indeterminate = some && !allChecked; }
        }
    }

    // Selection events
    if (withSelection) {
        container.addEventListener("change", e => {
            if (e.target.id === "select-all") {
                const checked = e.target.checked;
                container.querySelectorAll(".row-checkbox").forEach(cb => {
                    cb.checked = checked;
                    checked ? selectedItems.add(cb.value) : selectedItems.delete(cb.value);
                });
                renderRows(tableContent);
                if (onSelectionChangeDefault) onSelectionChangeDefault(selectedItems);
            } else if (e.target.classList.contains("row-checkbox")) {
                e.target.checked ? selectedItems.add(e.target.value) : selectedItems.delete(e.target.value);
                renderRows(tableContent);
                if (onSelectionChangeDefault) onSelectionChangeDefault(selectedItems);
            }
        });
    }

    // Dropdown handling
    document.addEventListener("click", e => {
        document.querySelectorAll(".dropdown-menu").forEach(m => m.style.display = "none");
        if (e.target.closest(".dropdown-toggle")) {
            e.target.closest(".dropdown").querySelector(".dropdown-menu").style.display = "flex";
            e.stopPropagation();
        }
    });

    // Sorting (client-side for now)
    headersElements.forEach((h, idx) => {
        h.addEventListener("click", e => {
            const key = h.dataset.key;
            currentSort.asc = currentSort.key === key ? !currentSort.asc : true;
            currentSort.key = key;
            const rowKey = rows[idx];

            tableContent.sort((a, b) => {
                let vA = a[rowKey], vB = b[rowKey];
                if (vA == null) return 1;
                if (vB == null) return -1;
                const isNum = !isNaN(parseFloat(vA)) && !isNaN(parseFloat(vB));
                if (isNum) { vA = parseFloat(vA); vB = parseFloat(vB); }
                else { vA = vA.toString().toLowerCase(); vB = vB.toString().toLowerCase(); }
                return vA < vB ? (currentSort.asc ? -1 : 1) : vA > vB ? (currentSort.asc ? 1 : -1) : 0;
            });

            headersElements.forEach(hdr => {
                hdr.querySelector('.down')?.classList.remove('text-blue-500' ,'dark:text-white');
                hdr.querySelector('.up')?.classList.remove('text-blue-500', 'dark:text-white');
            });
            e.target.closest('th')?.querySelector(currentSort.asc ? '.up' : '.down')?.classList.add('text-blue-500' ,'dark:text-white');
            renderRows(tableContent);
        });
    });

    // Per-page change - trigger event
    if (per_pageSelect) {
        per_pageSelect.addEventListener("change", function() {
            per_page = parseInt(this.value);
            triggerTableEvent('perPageChange', per_page);
        });
    }

    // Export functions
    function exportCSV() {
        const rows = [columns.join(","), ...tableContent.map(r => rowNames.map(k => {
            let v = r[k];
            if (typeof v === "string") v = `"${v.replace(/"/g, '""')}"`;
            return v ?? "";
        }).join(","))];
        const blob = new Blob([rows.join("\n")], {type: "text/csv"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "table.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function exportExcel() {
        const html = `<table><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr>${tableContent.map(r => `<tr>${rowNames.map(k => `<td>${r[k]??""}</td>`).join("")}</tr>`).join("")}</table>`;
        const blob = new Blob([html], {type: "application/vnd.ms-excel"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "table.xls";
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function exportPDF() {
        const w = window.open("", "_blank");
        const html = `<table border="1"><thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${tableContent.map(r => `<tr>${rowNames.map(k => `<td>${r[k]??""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        w.document.write(`<html><head><title>PDF</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px}th{background:#f4f4f4}</style></head><body><h2>Table</h2>${html}</body></html>`);
        w.document.close();
        w.print();
    }

    container.querySelector("#export-csv")?.addEventListener("click", exportCSV);
    container.querySelector("#export-excel")?.addEventListener("click", exportExcel);
    container.querySelector("#export-pdf")?.addEventListener("click", exportPDF);

    renderPagination();
    renderRows(tableContent);
}
