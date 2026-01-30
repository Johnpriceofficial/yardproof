#!/usr/bin/env python3
"""
Render floorplan images for all inflatables.
Converts JSON specs → SVG (PNG conversion happens in GitHub Actions)
"""

import json
import glob
from pathlib import Path

OUT_DIR = Path("output/floorplans")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def svg_floorplan(spec: dict) -> str:
    """Generate SVG floorplan from spec"""
    W, H = 900, 900               # canvas px (consistent output)
    pad = 120                     # room for dimension lines
    box_x, box_y = pad, pad
    box_w, box_h = W - 2*pad, H - 2*pad

    title = spec.get("label", spec["slug"])
    top_dim = f'{spec["width_ft"]:.1f} ft'
    right_dim = f'{spec["height_ft"]:.1f} ft'
    area_label = f'{spec["setup_area_sq_ft"]:.0f} sq ft'

    # Helper to convert pct coords to px in the main box
    def px(x_pct, y_pct):
        return (box_x + x_pct * box_w, box_y + y_pct * box_h)

    anchors = spec.get("anchors", [])
    blower_pipes = spec.get("blower_pipes", [])
    
    # Determine theme color
    theme = spec.get("theme", "standard")
    theme_colors = {
        "princess": "#E75480",
        "sports": "#228B22",
        "character": "#FFB347",
        "standard": "#3b6ea8"
    }
    
    # Check name for theme hints
    name_lower = title.lower()
    if "princess" in name_lower or "frozen" in name_lower or "pink" in name_lower:
        fill_color = theme_colors["princess"]
    elif "sport" in name_lower or "football" in name_lower:
        fill_color = theme_colors["sports"]
    elif any(char in name_lower for char in ["dora", "elmo", "shark", "spongebob", "mario", "avengers"]):
        fill_color = theme_colors["character"]
    else:
        fill_color = theme_colors["standard"]

    # Basic SVG with professional styling
    svg = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
      <defs>
        <style>
          .title {{ font: bold 32px Arial, sans-serif; fill: #111; }}
          .dim {{ font: bold 28px Arial, sans-serif; fill: #111; }}
          .label {{ font: 26px Arial, sans-serif; fill: #fff; }}
          .small {{ font: 22px Arial, sans-serif; fill: #111; }}
          .tiny {{ font: 18px Arial, sans-serif; fill: #666; }}
        </style>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#111"/>
        </marker>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:{fill_color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:{fill_color};stop-opacity:0.7" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="{W}" height="{H}" fill="#f9fafb"/>

      <!-- Title -->
      <text x="{W/2}" y="50" text-anchor="middle" class="title">{title}</text>
      <text x="{W/2}" y="80" text-anchor="middle" class="tiny">Setup Area Required</text>

      <!-- Main inflatable rectangle with gradient -->
      <rect x="{box_x}" y="{box_y}" width="{box_w}" height="{box_h}" rx="12" fill="url(#grad)" stroke="#111" stroke-width="5"/>

      <!-- Center label -->
      <text x="{W/2}" y="{H/2-20}" text-anchor="middle" class="label">Jumping Area</text>
      <text x="{W/2}" y="{H/2+15}" text-anchor="middle" class="label">{area_label}</text>

      <!-- Top dimension line -->
      <line x1="{box_x}" y1="{box_y-50}" x2="{box_x+box_w}" y2="{box_y-50}" stroke="#111" stroke-width="4"
            marker-start="url(#arrow)" marker-end="url(#arrow)"/>
      <text x="{W/2}" y="{box_y-65}" text-anchor="middle" class="dim">{top_dim}</text>

      <!-- Right dimension line -->
      <line x1="{box_x+box_w+50}" y1="{box_y}" x2="{box_x+box_w+50}" y2="{box_y+box_h}" stroke="#111" stroke-width="4"
            marker-start="url(#arrow)" marker-end="url(#arrow)"/>
      <text x="{box_x+box_w+85}" y="{H/2}" text-anchor="middle" class="dim" transform="rotate(90 {box_x+box_w+85},{H/2})">{right_dim}</text>
    ''']

    # Anchors (red circles with D-ring symbol)
    for a in anchors:
        x, y = px(a["x_pct"], a["y_pct"])
        svg.append(f'''
      <circle cx="{x}" cy="{y}" r="24" fill="#d62424" stroke="#111" stroke-width="3"/>
      <circle cx="{x}" cy="{y}" r="12" fill="none" stroke="#fff" stroke-width="2.5"/>
        ''')

    # Blower pipes (small tabs on top edge)
    for bp in blower_pipes:
        x, y = px(bp.get("x_pct", 0.5), 0.0)
        svg.append(f'<rect x="{x-20}" y="{box_y-22}" width="40" height="40" rx="4" fill="#7aa7d8" stroke="#111" stroke-width="3"/>')
        svg.append(f'<circle cx="{x}" cy="{box_y-2}" r="8" fill="#333"/>')
    
    if blower_pipes:
        svg.append(f'<text x="{W/2}" y="{box_y-30}" text-anchor="middle" class="small">Blower Connection</text>')

    # Entrance / Exit bottom label + ramp tab
    entrance = spec.get("entrance")
    ramp = spec.get("ramp")
    if ramp:
        ramp_w = 180
        svg.append(f'''
      <rect x="{W/2-ramp_w/2}" y="{box_y+box_h}" width="{ramp_w}" height="70" rx="6" fill="#7aa7d8" stroke="#111" stroke-width="3"/>
      <text x="{W/2}" y="{box_y+box_h+45}" text-anchor="middle" class="small">{ramp.get("label","Ramp")}</text>
        ''')
    
    if entrance:
        svg.append(f'<text x="{W/2}" y="{box_y+box_h-25}" text-anchor="middle" class="label">{entrance.get("label","Entrance / Exit")}</text>')

    # Footer note
    svg.append(f'''
      <text x="{W/2}" y="{H-30}" text-anchor="middle" class="tiny">🔴 Anchor Points  ⚡ Requires continuous blower power</text>
    ''')

    svg.append("</svg>")
    return "\n".join(svg)

def main():
    """Process all spec files and generate floorplans"""
    spec_files = sorted(glob.glob("inflatables/*.json"))
    
    if not spec_files:
        print("❌ No spec files found in inflatables/")
        print("   Run: python scripts/convert_products_to_specs.py first")
        return
    
    print(f"🎨 Rendering {len(spec_files)} floorplans...\n")
    
    generated_svg = 0
    
    for path in spec_files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                spec = json.load(f)
            
            svg = svg_floorplan(spec)
            slug = spec["slug"]
            
            # Save SVG
            svg_path = OUT_DIR / f"{slug}.svg"
            svg_path.write_text(svg, encoding="utf-8")
            generated_svg += 1
            print(f"✅ {slug}.svg")
                
        except Exception as e:
            print(f"❌ Error rendering {path}: {e}")
    
    print(f"\n🎉 Generated {generated_svg} SVG files")
    print(f"📁 Output: {OUT_DIR}")
    print(f"\n💡 PNG conversion will happen automatically in GitHub Actions")

if __name__ == "__main__":
    main()
