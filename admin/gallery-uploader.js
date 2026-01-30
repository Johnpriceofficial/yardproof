// Admin Gallery Uploader - Product Matching & Layout Generation
// State
let products = [];
let uploadedFiles = [];
let matchedItems = [];

// Load products
async function loadProducts() {
    try {
        const response = await fetch('../products.json');
        products = await response.json();
        console.log(`Loaded ${products.length} products`);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initializeUploader();
});

function initializeUploader() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    
    // Click to browse
    browseBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
        if (e.target !== browseBtn) fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
}

// Handle file selection
async function handleFiles(files) {
    const validFiles = [];
    const errors = [];
    
    // Validate files
    for (const file of files) {
        if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
            errors.push(`${file.name}: Invalid file type. Only PNG/JPG allowed.`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) {
            errors.push(`${file.name}: File too large. Max 10MB.`);
            continue;
        }
        validFiles.push(file);
    }
    
    // Show errors
    if (errors.length > 0) {
        alert('Some files were rejected:\n\n' + errors.join('\n'));
    }
    
    if (validFiles.length === 0) return;
    
    // Show progress
    document.getElementById('upload-progress').style.display = 'block';
    document.getElementById('progress-text').textContent = `Processing ${validFiles.length} file(s)...`;
    
    // Process files
    for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const progress = ((i + 1) / validFiles.length) * 100;
        
        document.getElementById('progress-percent').textContent = `${Math.round(progress)}%`;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        
        await processFile(file);
    }
    
    // Hide progress, show results
    setTimeout(() => {
        document.getElementById('upload-progress').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';
    }, 500);
}

// Process single file
async function processFile(file) {
    const fileData = {
        file: file,
        filename: file.name,
        size: file.size,
        preview: await createImagePreview(file),
        originalDataUrl: null,
        matchedProduct: null,
        layoutDataUrl: null
    };
    
    // Create preview card
    addPreviewCard(fileData);
    
    // Read file as data URL
    fileData.originalDataUrl = await readFileAsDataURL(file);
    
    // Match product
    fileData.matchedProduct = matchProduct(fileData);
    
    // Generate layout
    if (fileData.matchedProduct) {
        fileData.layoutDataUrl = await generateVirtualLayout(fileData.matchedProduct, fileData);
    }
    
    // Add to results
    matchedItems.push(fileData);
    addResultCard(fileData);
    
    return fileData;
}

// Create image preview
function createImagePreview(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Read file as data URL
function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Add preview card
function addPreviewCard(fileData) {
    const grid = document.getElementById('preview-grid');
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.id = `preview-${Date.now()}`;
    
    card.innerHTML = `
        <img src="${fileData.preview}" alt="${fileData.filename}" class="preview-image">
        <div class="preview-info">
            <div class="preview-filename">${fileData.filename}</div>
            <div class="preview-size">${formatFileSize(fileData.size)}</div>
            <div class="preview-status processing">
                <span>⏳</span> Processing...
            </div>
        </div>
    `;
    
    grid.appendChild(card);
}

// Product matching engine
function matchProduct(fileData) {
    const filename = fileData.filename.toLowerCase();
    const tokens = tokenizeFilename(filename);
    
    const matches = products.map(product => {
        const score = calculateMatchScore(tokens, product);
        return { product, score };
    });
    
    // Sort by score
    matches.sort((a, b) => b.score - a.score);
    
    const bestMatch = matches[0];
    
    // Return match with confidence
    if (bestMatch.score > 0.7) {
        return {
            ...bestMatch.product,
            matchConfidence: 'high',
            matchScore: bestMatch.score,
            matchReason: 'Strong filename match'
        };
    } else if (bestMatch.score > 0.4) {
        return {
            ...bestMatch.product,
            matchConfidence: 'medium',
            matchScore: bestMatch.score,
            matchReason: 'Partial filename match'
        };
    } else {
        return {
            ...bestMatch.product,
            matchConfidence: 'low',
            matchScore: bestMatch.score,
            matchReason: 'Weak match - please verify'
        };
    }
}

// Tokenize filename
function tokenizeFilename(filename) {
    // Remove extension
    filename = filename.replace(/\.(png|jpg|jpeg)$/i, '');
    // Split by separators
    const tokens = filename.split(/[-_\s]+/);
    // Remove common words
    const stopWords = ['bounce', 'house', 'rental', 'ri', 'rhode', 'island', 'inflatable'];
    return tokens.filter(t => t.length > 2 && !stopWords.includes(t));
}

// Calculate match score
function calculateMatchScore(tokens, product) {
    const productName = product.name.toLowerCase();
    const productTokens = productName.split(/\s+/);
    
    let score = 0;
    
    // Check each token
    for (const token of tokens) {
        // Exact match in name
        if (productName.includes(token)) {
            score += 0.3;
        }
        // Match in product tokens
        for (const pToken of productTokens) {
            if (pToken.includes(token) || token.includes(pToken)) {
                score += 0.2;
            }
        }
        // Fuzzy match
        if (levenshteinDistance(token, productName) < 5) {
            score += 0.1;
        }
    }
    
    return Math.min(score, 1.0);
}

// Levenshtein distance
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Generate virtual layout (2000x1000 PNG)
async function generateVirtualLayout(product, fileData) {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(0, 0, 2000, 1000);
    
    // Left side: Diagram (1200px)
    const diagramWidth = 1200;
    const diagramHeight = 1000;
    
    renderLayoutDiagram(ctx, product, 0, 0, diagramWidth, diagramHeight);
    
    // Right side: Info panel (800px)
    const infoX = 1200;
    renderInfoPanel(ctx, product, fileData, infoX, 0, 800, 1000);
    
    return canvas.toDataURL('image/png');
}

// Render layout diagram
function renderLayoutDiagram(ctx, product, x, y, width, height) {
    const setupArea = product.setup_area;
    const actualSize = product.actual_size;
    
    // Calculate scale
    const maxDimension = Math.max(setupArea.length, setupArea.width);
    const scale = Math.min((width - 200) / maxDimension, (height - 200) / maxDimension);
    
    const setupW = setupArea.length * scale;
    const setupH = setupArea.width * scale;
    const actualW = actualSize.length * scale;
    const actualH = actualSize.width * scale;
    
    // Center position
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Setup Area (outer rectangle)
    ctx.fillStyle = 'rgba(59, 110, 168, 0.15)';
    ctx.strokeStyle = '#3b6ea8';
    ctx.lineWidth = 4;
    ctx.fillRect(centerX - setupW / 2, centerY - setupH / 2, setupW, setupH);
    ctx.strokeRect(centerX - setupW / 2, centerY - setupH / 2, setupW, setupH);
    
    // Actual Size (inner rectangle)
    ctx.fillStyle = 'rgba(59, 110, 168, 0.8)';
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 3;
    ctx.fillRect(centerX - actualW / 2, centerY - actualH / 2, actualW, actualH);
    ctx.strokeRect(centerX - actualW / 2, centerY - actualH / 2, actualW, actualH);
    
    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('JUMPING AREA', centerX, centerY);
    
    // Dimensions
    ctx.fillStyle = '#111';
    ctx.font = 'bold 28px Arial';
    
    // Top dimension (Setup Area)
    ctx.fillText(`${setupArea.length}' × ${setupArea.width}' Setup Area`, centerX, centerY - setupH / 2 - 40);
    ctx.fillText(`${setupArea.sq_ft} sq ft required`, centerX, centerY - setupH / 2 - 10);
    
    // Entrance label
    ctx.fillStyle = '#2EA4DD';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('↓ Entrance / Exit', centerX, centerY + setupH / 2 + 40);
    
    // Anchor points
    const anchorPositions = [
        [centerX - setupW / 2 + 30, centerY - setupH / 2 + 30],
        [centerX + setupW / 2 - 30, centerY - setupH / 2 + 30],
        [centerX - setupW / 2 + 30, centerY + setupH / 2 - 30],
        [centerX + setupW / 2 - 30, centerY + setupH / 2 - 30]
    ];
    
    ctx.fillStyle = '#d62424';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    anchorPositions.forEach(([ax, ay]) => {
        ctx.beginPath();
        ctx.arc(ax, ay, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
}

// Render info panel
function renderInfoPanel(ctx, product, fileData, x, y, width, height) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, width, height);
    
    // Product name
    ctx.fillStyle = '#111';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'left';
    
    const lines = wrapText(ctx, product.name, width - 80, 42);
    let currentY = y + 80;
    lines.forEach(line => {
        ctx.fillText(line, x + 40, currentY);
        currentY += 50;
    });
    
    currentY += 30;
    
    // Specs
    ctx.font = '28px Arial';
    ctx.fillStyle = '#374151';
    
    const specs = [
        `Setup Area: ${product.setup_area.length}' × ${product.setup_area.width}' × ${product.setup_area.height}'`,
        `Total Space: ${product.setup_area.sq_ft} sq ft`,
        ``,
        `Actual Size: ${product.actual_size.length}' × ${product.actual_size.width}' × ${product.actual_size.height}'`,
        `Jumping Area: ${product.actual_size.sq_ft} sq ft`,
        ``,
        `Category: ${product.category.replace('_', ' ').toUpperCase()}`,
        ``,
        `Requirements:`,
        `• Continuous blower power`,
        `• 4 anchor points required`,
        `• Level ground surface`,
        `• Clearance for entrance ramp`
    ];
    
    specs.forEach(spec => {
        ctx.fillText(spec, x + 40, currentY);
        currentY += 40;
    });
    
    // Footer
    currentY = y + height - 80;
    ctx.font = '22px Arial';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('Virtual Layout • 2000×1000', x + 40, currentY);
    ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, x + 40, currentY + 35);
}

// Wrap text
function wrapText(ctx, text, maxWidth, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

// Add result card
function addResultCard(fileData) {
    const grid = document.getElementById('results-grid');
    const product = fileData.matchedProduct;
    
    // Generate SEO filename
    const seoFilename = generateSEOFilename(product);
    
    // Save to localStorage gallery
    saveToGallery(fileData);
    
    const card = document.createElement('div');
    card.className = 'result-card';
    
    card.innerHTML = `
        <div class="result-images">
            <div class="result-image-wrapper">
                <span class="result-image-label">Original</span>
                <img src="${fileData.originalDataUrl}" alt="Original" class="result-image">
            </div>
            <div class="result-image-wrapper">
                <span class="result-image-label">Virtual Layout</span>
                <img src="${fileData.layoutDataUrl}" alt="Layout" class="result-image">
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
                    <span class="meta-label">Match:</span>
                    <span class="meta-value">${product.matchReason} <span class="match-confidence ${product.matchConfidence}">${product.matchConfidence}</span></span>
                </div>
            </div>
            <div class="result-keywords">
                <span class="keyword-tag">${product.category.replace('_', ' ')}</span>
                <span class="keyword-tag">${product.setup_area.sq_ft} sq ft</span>
                <span class="keyword-tag">${product.actual_size.length}×${product.actual_size.width}</span>
            </div>
            <div class="result-actions">
                <button class="btn btn-primary" onclick="downloadLayout('${seoFilename}', ${JSON.stringify(fileData.layoutDataUrl).replace(/'/g, "&apos;")})">
                    📥 Layout PNG
                </button>
                <button class="btn btn-secondary" onclick="downloadOriginal('${fileData.filename}', ${JSON.stringify(fileData.originalDataUrl).replace(/'/g, "&apos;")})">
                    📥 Original
                </button>
                <button class="btn btn-secondary" onclick="downloadBoth('${seoFilename}', '${fileData.filename}', ${JSON.stringify(fileData.originalDataUrl).replace(/'/g, "&apos;")}, ${JSON.stringify(fileData.layoutDataUrl).replace(/'/g, "&apos;")})">
                    📦 Both (ZIP)
                </button>
            </div>
        </div>
    `;
    
    grid.appendChild(card);
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

// Download layout
function downloadLayout(filename, dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
}

// Download original
function downloadOriginal(filename, dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
}

// Download both (ZIP)
async function downloadBoth(layoutFilename, originalFilename, originalDataUrl, layoutDataUrl) {
    // Note: Creating ZIP client-side requires JSZip library
    alert('ZIP download would require JSZip library. For now, download individually.');
    downloadOriginal(originalFilename, originalDataUrl);
    setTimeout(() => downloadLayout(layoutFilename, layoutDataUrl), 500);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Save to gallery (localStorage)
function saveToGallery(fileData) {
    const gallery = JSON.parse(localStorage.getItem('yardproof_gallery') || '[]');
    gallery.push({
        ...fileData,
        file: null, // Don't store File object
        timestamp: Date.now()
    });
    localStorage.setItem('yardproof_gallery', JSON.stringify(gallery));
}
