import { fetchSystemInfo, fetchHistory, fetchMetrics} from "./system.js";

let refreshInterval = 2500;
let intervalId;

function startFetchingMetrics() {
    intervalId = setInterval(fetchMetrics, refreshInterval); // Set the new interval
}

async function initializeCharts() {
    await fetchHistory(); // Populate the graphs with historical data
    //setInterval(fetchLatest, refreshInterval); // Start fetching latest data points periodically
}

// Event listener for applying a new refresh rate
document.getElementById('applyRate').addEventListener('click', () => {
    const input = document.getElementById('refreshRate');
    const newRate = parseInt(input.value, 10);

    if (newRate >= 500) { // Set a minimum refresh rate of 500ms
        refreshInterval = newRate;
        clearInterval(intervalId); // Clear the previous interval
        intervalId = setInterval(fetchMetrics, refreshInterval); // Apply the new interval
    } else {
        alert('Please enter a value of at least 500 ms');
    }
});

// Drag and Drop Functionality
const gridRows = document.querySelectorAll('.grid-row');
let draggedItem = null;
const resize_event = new CustomEvent('resize_event', {});

document.querySelectorAll('.grid-item').forEach((item, index) => {
    item.id = `item-${index + 1}`;
});

gridRows.forEach(row => {
    row.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(row, e.clientX);
        if (afterElement == null) {
            row.appendChild(draggedItem);
        } else {
            row.insertBefore(draggedItem, afterElement);
        }
        saveItemState(draggedItem); // Save state after dragging
    });
});

document.querySelectorAll('.grid-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
    });
});

document.addEventListener('resize_event', () =>{
    console.log("event");
    document.querySelectorAll('.grid-item').forEach(item =>{
        saveItemState(item);
    })
})

// Function to save item state
function saveItemState(item) {
    const row = item.parentElement;
    const items = [...row.querySelectorAll('.grid-item')];
    const itemIndex = items.indexOf(item);

    const state = {
        width: item.offsetWidth,
        rowIndex: Array.from(gridRows).indexOf(row),
        itemIndex: itemIndex,
    };

    // Save to localStorage
    localStorage.setItem(`item-${item.id}`, JSON.stringify(state));
}

// Restore item state on page load
function restoreItemState() {
    document.querySelectorAll('.grid-item').forEach(item => {
        const state = JSON.parse(localStorage.getItem(`item-${item.id}`));
        if (state) {
            // Restore width
            item.style.width = `${state.width}px`;

            // Restore position
            const row = gridRows[state.rowIndex];
            const items = [...row.querySelectorAll('.grid-item')];
            if (state.itemIndex >= 0 && state.itemIndex < items.length) {
                row.insertBefore(item, items[state.itemIndex]);
            } else {
                row.appendChild(item);
            }
        }
    });
}

// Call restoreItemState on page load
window.addEventListener('load', () => {
    restoreItemState();
});

function getDragAfterElement(row, x) {
    const draggableElements = [...row.querySelectorAll('.grid-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offsetX = x - box.left - box.width / 2;
        if (offsetX < 0 && offsetX > closest.offsetX) {
            return { offsetX, element: child };
        } else {
            return closest;
        }
    }, { offsetX: Number.NEGATIVE_INFINITY }).element;
}

// Function to handle resizing
function setupResizeHandles(item) {
    const leftHandle = item.querySelector('.resize-handle-left');
    const rightHandle = item.querySelector('.resize-handle-right');

    let startX, startWidth, startAdjacentWidth;

    // Resize from the left
    leftHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        startWidth = item.offsetWidth;
        const adjacentItem = item.previousElementSibling;
        if (adjacentItem) {
            startAdjacentWidth = adjacentItem.offsetWidth;
        }

        document.addEventListener('mousemove', onLeftResize);
        document.addEventListener('mouseup', stopResize);
    });

    // Resize from the right
    rightHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        startWidth = item.offsetWidth;
        const adjacentItem = item.nextElementSibling;
        if (adjacentItem) {
            startAdjacentWidth = adjacentItem.offsetWidth;
        }

        document.addEventListener('mousemove', onRightResize);
        document.addEventListener('mouseup', stopResize);
    });

    function onLeftResize(e) {
        const deltaX = e.clientX - startX;
        const newWidth = startWidth - deltaX;
        const newAdjacentWidth = startAdjacentWidth + deltaX;

        if (newWidth > 300 && newAdjacentWidth > 300) { // Minimum width
            item.style.width = `${newWidth}px`;
            const adjacentItem = item.previousElementSibling;
            if (adjacentItem) {
                adjacentItem.style.width = `${newAdjacentWidth}px`;
            }
        }
    }

    function onRightResize(e) {
        const deltaX = e.clientX - startX;
        const newWidth = startWidth + deltaX;
        const newAdjacentWidth = startAdjacentWidth - deltaX;

        if (newWidth > 300 && newAdjacentWidth > 300) { // Minimum width
            item.style.width = `${newWidth}px`;
            const adjacentItem = item.nextElementSibling;
            if (adjacentItem) {
                adjacentItem.style.width = `${newAdjacentWidth}px`;
            }
        }
    }

    function stopResize(item) {
        document.removeEventListener('mousemove', onLeftResize);
        document.removeEventListener('mousemove', onRightResize);
        document.removeEventListener('mouseup', stopResize);
        document.dispatchEvent(resize_event);
    }
}

// Set up resize handles for all items
document.querySelectorAll('.grid-item').forEach(item => {
    setupResizeHandles(item);
});

// Initialize the grid layout
function initializeGrid() {
    const gridContainer = document.querySelector('.grid-container');
    gridContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
}

initializeGrid();
fetchSystemInfo();
fetchMetrics();
startFetchingMetrics();
initializeCharts();
