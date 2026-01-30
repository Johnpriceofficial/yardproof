// Gallery viewer
let galleryItems = [];

// Load gallery items from localStorage
function loadGalleryItems() {
    const stored = localStorage.getItem('yardproof_gallery');
    if (stored) {
        try {
            galleryItems = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading gallery:', e);
            galleryItems = [];
        }
    }
}

// Display gallery
function displayGallery() {
    const grid = document.getElementById('gallery-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (galleryItems.length === 0) {
        emptyState.style.display = 'block';
        grid.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    grid.style.display = 'grid';
    
    grid.innerHTML = galleryItems.map((item, index) => {
        const product = item.matchedProduct;
        const seoFilename = generateSEOFilename(product);
        
        return `
            <div class="result-card">
                <div class="result-images">
                    <div class="result-image-wrapper">
                        <span class="result-image-label">Original</span>
                        <img src="${item.originalDataUrl}" alt="Original" class="result-image">
                    </div>
                    <div class="result-image-wrapper">
                        <span class="result-image-label">Virtual Layout</span>
                        <img src="${item.layoutDataUrl}" alt="Layout" class="result-image">
                    </div>
                </div>
                <div class="result-info">
                    <div class="result-title">${product.name}</div>
                    <div class="result-meta">
                        <div class="meta-item">
                            <span class="meta-label">Setup Area:</span>
                            <span class="meta-value">${product.setup_area.length}' × ${product.setup_area.width}' (${product.setup_area.sq_ft} sq ft)</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Added:</span>
                            <span class="meta-value">${new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="result-keywords">
                        <span class="keyword-tag">${product.category.replace('_', ' ')}</span>
                        <span class="keyword-tag">${product.setup_area.sq_ft} sq ft</span>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-primary" onclick="downloadImage('${seoFilename}', '${item.layoutDataUrl}')">
                            📥 Layout
                        </button>
                        <button class="btn btn-secondary" onclick="downloadImage('${item.filename}', '${item.originalDataUrl}')">
                            📥 Original
                        </button>
                        <button class="btn btn-secondary" style="background: #EF4444;" onclick="deleteItem(${index})">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Generate SEO filename
function generateSEOFilename(product) {
    const slug = product.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    
    return `${slug}-virtual-layout-2000x1000.png`;
}

// Download image
function downloadImage(filename, dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
}

// Delete item
function deleteItem(index) {
    if (confirm('Delete this item from gallery?')) {
        galleryItems.splice(index, 1);
        localStorage.setItem('yardproof_gallery', JSON.stringify(galleryItems));
        displayGallery();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGalleryItems();
    displayGallery();
});
