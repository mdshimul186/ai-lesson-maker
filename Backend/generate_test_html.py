#!/usr/bin/env python3
"""
Generate actual HTML file to inspect the scaling
"""

def generate_test_html():
    """Generate a test HTML file with 4K scaling"""
    print("🔍 GENERATING: Test HTML with 4K scaling")
    
    # 4K parameters
    width, height = 3840, 2160
    base_width, base_height = 1280, 720
    resolution_scale = min(width / base_width, height / base_height)
    base_font_size = max(1.0, 0.8 + (resolution_scale * 0.4))
    padding = int(20 + (resolution_scale * 15))
    line_height = 1.6
    mermaid_font_size = int(12 + (resolution_scale * 6))
    heading_multiplier = 1.2
    
    print(f"📊 4K Parameters:")
    print(f"   Resolution: {width}x{height}")
    print(f"   Scale factor: {resolution_scale}")
    print(f"   Base font size: {base_font_size}em")
    print(f"   Mermaid font size: {mermaid_font_size}px")
    print(f"   Padding: {padding}px")
    
    # Generate the HTML (simulating the actual template)
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width={width}, height={height}, initial-scale=1.0, user-scalable=no">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <style>
        :root {{
            --primary-color: #2563eb;
            --secondary-color: #f1f5f9;
            --accent-color: #3b82f6;
            --background-color: #ffffff;
            --text-color: #1e293b;
            --border-color: #e2e8f0;
            --base-font-size: {base_font_size}em;
            --padding: {padding}px;
            --line-height: {line_height};
        }}
        
        * {{
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: var(--line-height);
            padding: var(--padding);
            background-color: var(--background-color);
            color: var(--text-color);
            max-width: 100%;
            font-size: {base_font_size}em !important;
            margin: 0;
            min-height: 100vh;
        }}
        
        h1 {{ 
            font-size: {base_font_size * heading_multiplier * 2.3}em; 
            border-bottom: 3px solid var(--accent-color);
            padding-bottom: calc(var(--padding) / 4);
        }}
        
        h2 {{ 
            font-size: {base_font_size * heading_multiplier * 2}em;
            border-bottom: 2px solid var(--secondary-color);
            padding-bottom: calc(var(--padding) / 5);
        }}
        
        table {{
            border-collapse: collapse;
            margin: calc(var(--padding) / 3) 0;
            width: 100%;
            border: 2px solid var(--border-color);
            font-size: {base_font_size * 0.9}em;
            overflow: hidden;
            border-radius: 8px;
        }}
        
        th, td {{
            border: 1px solid var(--border-color);
            padding: calc(var(--padding) / 3) calc(var(--padding) / 2);
            text-align: left;
        }}
        
        th {{
            background-color: var(--primary-color);
            color: var(--background-color);
            font-weight: bold;
            font-size: {base_font_size * 0.95}em;
        }}
        
        .mermaid {{
            text-align: center;
            margin: calc(var(--padding) / 2) 0;
            padding: calc(var(--padding) / 2);
            background-color: var(--secondary-color);
            border-radius: 8px;
            border: 1px solid var(--border-color);
            overflow: visible;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        
        .mermaid svg {{
            max-width: 100%;
            height: auto;
            font-size: {mermaid_font_size}px !important;
        }}
    </style>
</head>
<body>
    <div id="content">
        <h1>4K Scaling Test</h1>
        <p>This text should be large at 4K resolution (font-size: {base_font_size}em)</p>
        
        <h2>Test Table</h2>
        <table>
            <tr>
                <th>Resolution</th>
                <th>Font Size</th>
                <th>Scale Factor</th>
            </tr>
            <tr>
                <td>720p</td>
                <td>1.2em</td>
                <td>1.0x</td>
            </tr>
            <tr>
                <td>4K</td>
                <td>{base_font_size}em</td>
                <td>{resolution_scale}x</td>
            </tr>
        </table>
        
        <h2>Test Diagram</h2>
        <div class="mermaid">
            graph TD
                A[720p Base] --> B[Scale Factor: 1.0x]
                C[4K Target] --> D[Scale Factor: {resolution_scale}x] 
                B --> E[Font: 1.2em]
                D --> F[Font: {base_font_size}em]
        </div>
    </div>
    
    <script>
        mermaid.initialize({{ 
            startOnLoad: false, 
            theme: 'default', 
            securityLevel: 'loose',
            flowchart: {{
                useMaxWidth: true,
                htmlLabels: true,
                fontSize: {mermaid_font_size}
            }},
            themeVariables: {{
                fontSize: '{mermaid_font_size}px'
            }}
        }});
        
        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        window.renderingComplete = true;
    </script>
</body>
</html>
"""
    
    # Save the HTML file
    with open('test_4k_scaling.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"\n✅ Generated test_4k_scaling.html")
    print(f"📄 Open this file in a browser to see if scaling is working")
    print(f"🔍 Expected: Large text at 4K resolution")

if __name__ == "__main__":
    generate_test_html()
