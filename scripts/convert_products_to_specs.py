#!/usr/bin/env python3
"""
Convert products.json into individual inflatable spec files for floorplan generation.
Generates one JSON per bounce house with layout specifications.
"""

import json
from pathlib import Path
import re

def slugify(name):
    """Convert name to URL-safe slug"""
    slug = name.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')

def generate_spec_files():
    """Read products.json and create individual spec files"""
    
    # Read products
    with open('products.json', 'r', encoding='utf-8') as f:
        products = json.load(f)
    
    # Filter bounce houses only
    bounce_houses = [p for p in products if p.get('category') == 'bounce_house']
    
    output_dir = Path('inflatables')
    output_dir.mkdir(exist_ok=True)
    
    for product in bounce_houses:
        slug = slugify(product['name'])
        setup = product['setup_area']
        actual = product['actual_size']
        
        # Default layout specs (can be customized per unit later)
        spec = {
            "slug": slug,
            "label": product['name'],
            "id": product['id'],
            
            # Setup area dimensions (total space needed)
            "width_ft": setup['length'],
            "height_ft": setup['width'],
            "setup_area_sq_ft": setup['sq_ft'],
            
            # Actual inflatable dimensions
            "actual_width_ft": actual['length'],
            "actual_height_ft": actual['width'],
            "actual_size_sq_ft": actual['sq_ft'],
            
            # Layout features (standardized for bounce houses)
            "entrance": {
                "side": "bottom",
                "label": "Entrance / Exit"
            },
            "ramp": {
                "side": "bottom",
                "label": "Ramp",
                "width_ft": 8
            },
            
            # Blower pipes (typically 2 on top for bounce houses)
            "blower_pipes": [
                {
                    "side": "top",
                    "label": "Blower Pipe",
                    "x_pct": 0.35
                },
                {
                    "side": "top",
                    "label": "Blower Pipe",
                    "x_pct": 0.65
                }
            ],
            
            # Anchor points (4 corners)
            "anchors": [
                {"x_pct": 0.08, "y_pct": 0.12},
                {"x_pct": 0.92, "y_pct": 0.12},
                {"x_pct": 0.08, "y_pct": 0.88},
                {"x_pct": 0.92, "y_pct": 0.88}
            ],
            
            # Additional metadata
            "category": product['category'],
            "theme": "standard"  # Can be customized: princess, sports, character, etc.
        }
        
        # Write spec file
        spec_path = output_dir / f"{slug}.json"
        with open(spec_path, 'w', encoding='utf-8') as f:
            json.dump(spec, f, indent=2, ensure_ascii=False)
        
        print(f"Created: {spec_path}")
    
    print(f"\n✅ Generated {len(bounce_houses)} spec files in inflatables/")

if __name__ == '__main__':
    generate_spec_files()
