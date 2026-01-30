#!/usr/bin/env python3
"""
Parse ERS items file and extract bounce house product data.
Extracts: name, Setup Area dimensions, Actual Size, category, image
"""

import re
import json

def parse_dimensions(dim_str):
    """Parse dimension string like '20′ L × 20′ W × 21′ H' into dict"""
    if not dim_str:
        return None
    
    # Clean input
    dim_str = dim_str.replace('′', "'").replace('×', 'x')
    
    # Extract numbers
    numbers = re.findall(r'(\d+(?:\.\d+)?)', dim_str)
    
    if len(numbers) >= 2:
        length = float(numbers[0])
        width = float(numbers[1])
        height = float(numbers[2]) if len(numbers) > 2 else None
        
        return {
            'length': length,
            'width': width,
            'height': height,
            'sq_ft': length * width
        }
    return None

def extract_product_data(text):
    """Extract all product data from a section"""
    product = {}
    
    # Extract title  
    title_match = re.search(r'Title\[_sep2_\]([^\[]+)', text)
    if title_match:
        title = title_match.group(1).strip()
        # Clean title
        title = title.split('|')[0].strip()
        title = title.split(' - ')[0].strip()
        title = re.sub(r'\s+(Rental|RI|Rhode Island).*$', '', title, flags=re.IGNORECASE)
        product['name'] = title.strip()
    
    # Determine category
    if any(word in text.lower() for word in ['bounce house', 'bouncer', 'castle', 'jumper']):
        product['category'] = 'bounce_house'
    elif any(word in text.lower() for word in ['slide', 'slip', 'water']):
        product['category'] = 'water_slide'
    elif any(word in text.lower() for word in ['combo']):
        product['category'] = 'combo'
    else:
        product['category'] = 'other'
    
    return product

def parse_items_file(filepath):
    """Parse the ERS items file and extract product data"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    products = []
    
    # Find all Setup Area markers
    setup_pattern = r'<strong>Setup Area:</strong>\s*([^<]+)'
    actual_pattern = r'<strong>Actual Size:</strong>\s*([^<]+)'
    
    setup_matches = list(re.finditer(setup_pattern, content, re.IGNORECASE))
    
    for match in setup_matches:
        # Get surrounding context (5KB before and after)
        start = max(0, match.start() - 5000)
        end = min(len(content), match.end() + 3000)
        section = content[start:end]
        
        # Extract product data
        product = extract_product_data(section)
        
        if not product.get('name'):
            continue
            
        # Get Setup Area dimensions
        setup_text = match.group(1)
        product['setup_area'] = parse_dimensions(setup_text)
        
        # Get Actual Size dimensions
        actual_match = re.search(actual_pattern, section, re.IGNORECASE)
        if actual_match:
            product['actual_size'] = parse_dimensions(actual_match.group(1))
        
        # Only include if we have both dimensions
        if product.get('setup_area') and product.get('actual_size'):
            # Add ID
            product['id'] = len(products) + 1
            products.append(product)
    
    return products

def main():
    input_file = '/Users/johnprice/Downloads/items (4).txt'
    output_file = '/Users/johnprice/Downloads/yardproof/products.json'
    
    print(f"Parsing {input_file}...")
    products = parse_items_file(input_file)
    
    # Filter bounce houses only
    bounce_houses = [p for p in products if p['category'] == 'bounce_house']
    
    print(f"\nFound {len(bounce_houses)} bounce houses with valid dimensions:")
    print("="*70)
    
    for product in bounce_houses:
        print(f"\n{product['id']}. {product['name']}")
        if product.get('setup_area'):
            sa = product['setup_area']
            print(f"   Setup Area: {sa['length']}' L × {sa['width']}' W × {sa.get('height', 'N/A')}' H")
            print(f"   ({sa['sq_ft']:.0f} sq ft required)")
        if product.get('actual_size'):
            act = product['actual_size']
            print(f"   Actual Size: {act['length']}' L × {act['width']}' W × {act.get('height', 'N/A')}' H")
    
    # Save all products to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2)
    
    print(f"\n\nSaved {len(products)} total products ({len(bounce_houses)} bounce houses) to products.json")
    print(f"Ready to build yardproof!")

if __name__ == '__main__':
    main()
