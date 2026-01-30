// Load products data
let products = [];

// Load products from JSON
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        
        // Filter only bounce houses
        products = products.filter(p => p.category === 'bounce_house');
        
        displayPopularProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Display popular products on homepage
function displayPopularProducts() {
    const grid = document.getElementById('products-grid');
    
    // Show first 9 bounce houses
    const popularProducts = products.slice(0, 9);
    
    popularProducts.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const setupArea = product.setup_area;
    const actualSize = product.actual_size;
    
    card.innerHTML = `
        <h3>${product.name}</h3>
        <div class="product-info">
            <p><strong>Setup Area:</strong> ${setupArea.length}' × ${setupArea.width}'${setupArea.height ? ` × ${setupArea.height}'` : ''}</p>
            <p><strong>Actual Size:</strong> ${actualSize.length}' × ${actualSize.width}'${actualSize.height ? ` × ${actualSize.height}'` : ''}</p>
            <p><strong>Space Required:</strong> ${Math.ceil(setupArea.sq_ft)} sq ft</p>
        </div>
    `;
    
    card.addEventListener('click', () => {
        // Scroll to measurement tool and highlight this product
        document.getElementById('tool').scrollIntoView({ behavior: 'smooth' });
    });
    
    return card;
}

// Find fitting products
function findFittingProducts() {
    const yardLength = parseFloat(document.getElementById('yard-length').value);
    const yardWidth = parseFloat(document.getElementById('yard-width').value);
    
    if (!yardLength || !yardWidth) {
        alert('Please enter both yard dimensions');
        return;
    }
    
    const yardArea = yardLength * yardWidth;
    
    // Filter products that fit
    const fittingProducts = products.filter(product => {
        const setupArea = product.setup_area;
        return setupArea.length <= yardLength && setupArea.width <= yardWidth;
    });
    
    displayResults(fittingProducts, yardLength, yardWidth, yardArea);
}

// Display fitting results
function displayResults(fittingProducts, yardLength, yardWidth, yardArea) {
    const resultsDiv = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    
    resultsList.innerHTML = '';
    
    if (fittingProducts.length === 0) {
        resultsList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                <p style="font-size: 1.2rem; color: var(--gray);">
                    No bounce houses fit your ${yardLength}' × ${yardWidth}' yard. 
                    Try increasing your yard dimensions or contact us for custom solutions!
                </p>
            </div>
        `;
    } else {
        // Sort by size (smallest first, best fit)
        fittingProducts.sort((a, b) => a.setup_area.sq_ft - b.setup_area.sq_ft);
        
        fittingProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'result-card';
            
            const setupArea = product.setup_area;
            const actualSize = product.actual_size;
            const percentUsed = ((setupArea.sq_ft / yardArea) * 100).toFixed(0);
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <h4>${product.name}</h4>
                    <span class="fit-badge">✓ Fits</span>
                </div>
                <p><strong>Setup:</strong> ${setupArea.length}' × ${setupArea.width}'</p>
                <p><strong>Actual Size:</strong> ${actualSize.length}' × ${actualSize.width}'</p>
                <p><strong>Uses:</strong> ${percentUsed}% of yard space</p>
                <p style="margin-top: 0.75rem; color: var(--secondary); font-weight: 600;">
                    ${setupArea.sq_ft} sq ft required
                </p>
            `;
            
            resultsList.appendChild(card);
        });
    }
    
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    
    const findBtn = document.getElementById('find-fit-btn');
    findBtn.addEventListener('click', findFittingProducts);
    
    // Allow Enter key in inputs
    ['yard-length', 'yard-width'].forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                findFittingProducts();
            }
        });
    });
});
