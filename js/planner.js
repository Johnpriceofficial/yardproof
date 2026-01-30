// Planner State
let products = [];
let yardLength = 40;
let yardWidth = 30;
let placedItems = [];
let scale = 10; // pixels per foot
let nextItemId = 1;

// Load products
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        products = products.filter(p => p.category === 'bounce_house');
        displayItemsList(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Display items in sidebar
function displayItemsList(items) {
    const list = document.getElementById('items-list');
    list.innerHTML = '';
    
    items.forEach(product => {
        const chip = document.createElement('div');
        chip.className = 'item-chip';
        chip.innerHTML = `
            <h4>${product.name}</h4>
            <p>${product.setup_area.length}' × ${product.setup_area.width}' setup</p>
        `;
        chip.addEventListener('click', () => addItemToYard(product));
        list.appendChild(chip);
    });
}

// Initialize yard canvas
function initYard() {
    const canvas = document.getElementById('yard-canvas');
    const grid = document.getElementById('yard-grid');
    
    const width = yardLength * scale;
    const height = yardWidth * scale;
    
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    grid.style.backgroundSize = `${scale}px ${scale}px`;
    
    updateYardStats();
}

// Add item to yard
function addItemToYard(product) {
    const item = {
        id: nextItemId++,
        product: product,
        x: 10, // Start position
        y: 10,
        rotation: 0
    };
    
    placedItems.push(item);
    renderPlacedItem(item);
    updateYardStats();
}

// Render placed item
function renderPlacedItem(item) {
    const container = document.getElementById('items-container');
    const setupArea = item.product.setup_area;
    const actualSize = item.product.actual_size;
    
    const setupWidth = setupArea.length * scale;
    const setupHeight = setupArea.width * scale;
    const actualWidth = actualSize.length * scale;
    const actualHeight = actualSize.width * scale;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'placed-item';
    itemDiv.id = `item-${item.id}`;
    itemDiv.style.left = item.x + 'px';
    itemDiv.style.top = item.y + 'px';
    
    itemDiv.innerHTML = `
        <div class="item-setup-area" style="width: ${setupWidth}px; height: ${setupHeight}px;">
            <div class="item-actual-size" style="width: ${actualWidth}px; height: ${actualHeight}px;">
                ${item.product.name.split(' ')[0]}
            </div>
        </div>
        <div class="item-label">${item.product.name}</div>
        <div class="item-remove">×</div>
    `;
    
    // Make draggable
    makeDraggable(itemDiv, item);
    
    // Remove on click
    itemDiv.querySelector('.item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeItem(item.id);
    });
    
    container.appendChild(itemDiv);
}

// Make item draggable
function makeDraggable(element, item) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag);
    
    function startDrag(e) {
        if (e.target.classList.contains('item-remove')) return;
        
        isDragging = true;
        element.style.cursor = 'grabbing';
        
        const rect = element.getBoundingClientRect();
        const canvasRect = element.parentElement.getBoundingClientRect();
        
        if (e.type === 'mousedown') {
            startX = e.clientX;
            startY = e.clientY;
        } else {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
        
        initialX = rect.left - canvasRect.left;
        initialY = rect.top - canvasRect.top;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', stopDrag);
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        let clientX, clientY;
        if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        
        const dx = clientX - startX;
        const dy = clientY - startY;
        
        let newX = initialX + dx;
        let newY = initialY + dy;
        
        // Constrain to yard bounds
        const maxX = (yardLength * scale) - element.offsetWidth;
        const maxY = (yardWidth * scale) - element.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        
        item.x = newX;
        item.y = newY;
    }
    
    function stopDrag() {
        isDragging = false;
        element.style.cursor = 'move';
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', stopDrag);
    }
}

// Remove item
function removeItem(itemId) {
    placedItems = placedItems.filter(item => item.id !== itemId);
    document.getElementById(`item-${itemId}`).remove();
    updateYardStats();
}

// Clear all items
function clearAll() {
    if (placedItems.length === 0) return;
    
    if (confirm('Remove all items from your yard?')) {
        placedItems = [];
        document.getElementById('items-container').innerHTML = '';
        updateYardStats();
    }
}

// Update yard stats
function updateYardStats() {
    const yardArea = yardLength * yardWidth;
    const totalUsed = placedItems.reduce((sum, item) => {
        return sum + item.product.setup_area.sq_ft;
    }, 0);
    const percentUsed = ((totalUsed / yardArea) * 100).toFixed(1);
    
    document.getElementById('stat-yard-size').textContent = `${yardArea.toLocaleString()} sq ft`;
    document.getElementById('stat-items-count').textContent = placedItems.length;
    document.getElementById('stat-space-used').textContent = `${percentUsed}%`;
}

// Update yard dimensions
function updateYard() {
    yardLength = parseFloat(document.getElementById('planner-yard-length').value);
    yardWidth = parseFloat(document.getElementById('planner-yard-width').value);
    
    // Clear items if yard shrinks
    const newArea = yardLength * yardWidth;
    placedItems = placedItems.filter(item => {
        const setupArea = item.product.setup_area;
        return setupArea.length <= yardLength && setupArea.width <= yardWidth;
    });
    
    // Re-render
    document.getElementById('items-container').innerHTML = '';
    initYard();
    placedItems.forEach(item => renderPlacedItem(item));
}

// Zoom controls
function zoomIn() {
    scale = Math.min(scale + 2, 20);
    updateYard();
}

function zoomOut() {
    scale = Math.max(scale - 2, 5);
    updateYard();
}

function resetView() {
    scale = 10;
    updateYard();
}

// Share layout
function shareLayout() {
    const summary = `My Yardproof Layout:\n${yardLength}' × ${yardWidth}' yard\n${placedItems.length} items:\n` +
        placedItems.map(item => `- ${item.product.name}`).join('\n');
    
    if (navigator.share) {
        navigator.share({
            title: 'My Yardproof Layout',
            text: summary,
            url: window.location.href
        });
    } else {
        alert(summary + '\n\nCopy this text to share!');
    }
}

// Search items
function searchItems() {
    const query = document.getElementById('item-search').value.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query)
    );
    displayItemsList(filtered);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initYard();
    
    // Close instructions modal
    document.getElementById('close-instructions').addEventListener('click', () => {
        document.getElementById('instructions-modal').style.display = 'none';
    });
    
    // Yard controls
    document.getElementById('update-yard-btn').addEventListener('click', updateYard);
    document.getElementById('clear-btn').addEventListener('click', clearAll);
    document.getElementById('share-btn').addEventListener('click', shareLayout);
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);
    document.getElementById('reset-view').addEventListener('click', resetView);
    
    // Search
    document.getElementById('item-search').addEventListener('input', searchItems);
});
