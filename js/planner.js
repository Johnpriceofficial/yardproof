// Planner State
let products = [];
let yardLength = 40;
let yardWidth = 30;
let placedItems = [];
let scale = 10; // pixels per foot
let nextItemId = 1;
let currentView = 'grid'; // 'grid' or 'satellite'
let map = null;
let yardRectangle = null;
let mapMarkers = [];
let geocoder = null;
let currentLocation = null;

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

// Initialize Google Map
function initMap() {
    // Default to Rhode Island (My Cousin Vinny's Rentals area)
    const defaultLocation = { lat: 41.8240, lng: -71.4128 };
    
    const mapContainer = document.getElementById('map-canvas');
    const mapDiv = document.createElement('div');
    mapDiv.id = 'map';
    mapContainer.appendChild(mapDiv);
    
    map = new google.maps.Map(mapDiv, {
        center: defaultLocation,
        zoom: 18,
        mapTypeId: 'satellite',
        tilt: 0,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_LEFT,
            mapTypeIds: ['satellite', 'hybrid', 'roadmap']
        },
        streetViewControl: false,
        fullscreenControl: true
    });
    
    geocoder = new google.maps.Geocoder();
    
    // Add drawing manager for manual yard selection
    const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['rectangle']
        },
        rectangleOptions: {
            fillColor: '#2EA4DD',
            fillOpacity: 0.3,
            strokeWeight: 3,
            strokeColor: '#2EA4DD',
            clickable: false,
            editable: true,
            zIndex: 1
        }
    });
    
    drawingManager.setMap(map);
    
    // Listen for rectangle complete
    google.maps.event.addListener(drawingManager, 'rectanglecomplete', function(rectangle) {
        if (yardRectangle) {
            yardRectangle.setMap(null);
        }
        yardRectangle = rectangle;
        calculateYardSizeFromRectangle(rectangle);
    });
}

// Find location from address
function findLocation() {
    const address = document.getElementById('address-input').value;
    if (!address) {
        alert('Please enter an address');
        return;
    }
    
    if (!geocoder) {
        alert('Maps not loaded yet. Please wait a moment and try again.');
        return;
    }
    
    geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK' && results[0]) {
            currentLocation = results[0].geometry.location;
            map.setCenter(currentLocation);
            map.setZoom(20);
            
            // Add marker
            clearMapMarkers();
            const marker = new google.maps.Marker({
                map: map,
                position: currentLocation,
                title: 'Your Location',
                animation: google.maps.Animation.DROP
            });
            mapMarkers.push(marker);
            
            // Draw initial yard rectangle
            drawYardOnMap();
            
            // Switch to satellite view
            switchToSatelliteView();
        } else {
            alert('Location not found: ' + status);
        }
    });
}

// Draw yard rectangle on map
function drawYardOnMap() {
    if (!map || !currentLocation) return;
    
    // Clear existing rectangle
    if (yardRectangle) {
        yardRectangle.setMap(null);
    }
    
    // Convert feet to meters (approximate)
    const metersPerFoot = 0.3048;
    const lengthMeters = yardLength * metersPerFoot;
    const widthMeters = yardWidth * metersPerFoot;
    
    // Calculate bounds
    const lat = currentLocation.lat();
    const lng = currentLocation.lng();
    
    // Approximate degree conversion at this latitude
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
    
    const latOffset = lengthMeters / metersPerDegreeLat / 2;
    const lngOffset = widthMeters / metersPerDegreeLng / 2;
    
    const bounds = {
        north: lat + latOffset,
        south: lat - latOffset,
        east: lng + lngOffset,
        west: lng - lngOffset
    };
    
    yardRectangle = new google.maps.Rectangle({
        bounds: bounds,
        map: map,
        fillColor: '#2EA4DD',
        fillOpacity: 0.3,
        strokeWeight: 3,
        strokeColor: '#2EA4DD',
        editable: true,
        draggable: true
    });
    
    // Listen for bounds changes
    google.maps.event.addListener(yardRectangle, 'bounds_changed', () => {
        calculateYardSizeFromRectangle(yardRectangle);
    });
    
    // Place bounce house markers
    updateMapMarkers();
}

// Calculate yard size from drawn rectangle
function calculateYardSizeFromRectangle(rectangle) {
    const bounds = rectangle.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    // Calculate distances
    const length = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(ne.lat(), sw.lng()),
        new google.maps.LatLng(sw.lat(), sw.lng())
    );
    
    const width = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(ne.lat(), ne.lng()),
        new google.maps.LatLng(ne.lat(), sw.lng())
    );
    
    // Convert meters to feet
    const lengthFeet = Math.round(length * 3.28084);
    const widthFeet = Math.round(width * 3.28084);
    
    // Update inputs
    document.getElementById('planner-yard-length').value = lengthFeet;
    document.getElementById('planner-yard-width').value = widthFeet;
    
    yardLength = lengthFeet;
    yardWidth = widthFeet;
    
    updateYardStats();
}

// Update map markers for placed items
function updateMapMarkers() {
    if (currentView !== 'satellite' || !map || !yardRectangle) return;
    
    // Clear existing item markers
    mapMarkers.forEach(marker => {
        if (marker.title !== 'Your Location') {
            marker.setMap(null);
        }
    });
    
    const bounds = yardRectangle.getBounds();
    const center = bounds.getCenter();
    
    placedItems.forEach(item => {
        // Calculate position relative to yard
        const xPercent = item.x / (yardLength * scale);
        const yPercent = item.y / (yardWidth * scale);
        
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        const lat = sw.lat() + (ne.lat() - sw.lat()) * (1 - yPercent);
        const lng = sw.lng() + (ne.lng() - sw.lng()) * xPercent;
        
        const marker = new google.maps.Marker({
            map: map,
            position: { lat, lng },
            title: item.product.name,
            label: {
                text: item.product.name.split(' ')[0],
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
            },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 15,
                fillColor: '#2EA4DD',
                fillOpacity: 0.8,
                strokeColor: 'white',
                strokeWeight: 2
            }
        });
        
        mapMarkers.push(marker);
    });
}

// Clear map markers
function clearMapMarkers() {
    mapMarkers.forEach(marker => marker.setMap(null));
    mapMarkers = [];
}

// Switch between views
function switchToGridView() {
    currentView = 'grid';
    document.getElementById('yard-canvas').style.display = 'block';
    document.getElementById('map-canvas').style.display = 'none';
    document.getElementById('grid-view-btn').classList.add('active');
    document.getElementById('satellite-view-btn').classList.remove('active');
}

function switchToSatelliteView() {
    currentView = 'satellite';
    document.getElementById('yard-canvas').style.display = 'none';
    document.getElementById('map-canvas').style.display = 'block';
    document.getElementById('grid-view-btn').classList.remove('active');
    document.getElementById('satellite-view-btn').classList.add('active');
    
    if (map) {
        google.maps.event.trigger(map, 'resize');
        if (currentLocation) {
            map.setCenter(currentLocation);
        }
    }
}

// Event listeners
window.initMap = initMap;

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initYard();
    
    // Close instructions modal
    document.getElementById('close-instructions').addEventListener('click', () => {
        document.getElementById('instructions-modal').style.display = 'none';
    });
    
    // Location controls
    document.getElementById('find-location-btn').addEventListener('click', findLocation);
    document.getElementById('address-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') findLocation();
    });
    
    // View toggle
    document.getElementById('grid-view-btn').addEventListener('click', switchToGridView);
    document.getElementById('satellite-view-btn').addEventListener('click', switchToSatelliteView);
    
    // Yard controls
    document.getElementById('update-yard-btn').addEventListener('click', () => {
        updateYard();
        if (currentView === 'satellite') {
            drawYardOnMap();
        }
    });
    document.getElementById('clear-btn').addEventListener('click', clearAll);
    document.getElementById('share-btn').addEventListener('click', shareLayout);
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', zoomIn);
    document.getElementById('zoom-out').addEventListener('click', zoomOut);
    document.getElementById('reset-view').addEventListener('click', resetView);
    
    // Search
    document.getElementById('item-search').addEventListener('input', searchItems);
});
