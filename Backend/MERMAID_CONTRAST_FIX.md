# 🎨 MERMAID DIAGRAM CONTRAST FIX

## Problem
The text inside mermaid diagrams has the same color as the background, making it hard to read.

## Solution Applied

### 1. Enhanced Mermaid Theme Variables
Updated the mermaid configuration in `llm.py` to provide better contrast:

```javascript
themeVariables: {
    primaryColor: '{{secondary_color}}',           // Light background for nodes
    primaryTextColor: '{{text_color}}',            // Dark text
    primaryBorderColor: '{{border_color}}',        // Border color
    lineColor: '{{accent_color}}',                 // Line colors
    secondaryColor: '{{background_color}}',        // Background
    tertiaryColor: '{{secondary_color}}',          // Alternative background
    background: '{{background_color}}',            // Main background
    mainBkg: '{{secondary_color}}',               // Main element background
    secondBkg: '{{background_color}}',            // Secondary background
    tertiaryTextColor: '{{text_color}}',          // Text color
    textColor: '{{text_color}}',                  // Primary text color
    nodeTextColor: '{{text_color}}',              // Node text color
    edgeLabelBackground: '{{background_color}}',   // Edge label background
    clusterBkg: '{{secondary_color}}',            // Cluster background
    fontSize: '{{mermaid_font_size}}px'           // Scaled font size
}
```

### 2. CSS Overrides for Text Contrast
Added CSS rules to force proper text contrast:

```css
/* Ensure mermaid text has proper contrast */
.mermaid svg text {
    fill: var(--text-color) !important;
    font-weight: 500 !important;
}

.mermaid svg .node rect,
.mermaid svg .node circle,
.mermaid svg .node ellipse,
.mermaid svg .node polygon {
    fill: var(--secondary-color) !important;
    stroke: var(--border-color) !important;
    stroke-width: 2px !important;
}

.mermaid svg .edgeLabel {
    background-color: var(--background-color) !important;
    color: var(--text-color) !important;
}
```

### 3. Better Default Theme Selection
Changed the default mermaid theme mapping to use "base" theme which has better contrast:

```python
def _get_mermaid_theme(self, theme: str) -> str:
    theme_mapping = {
        "modern": "base",
        "professional": "neutral", 
        "creative": "base",
        "education": "base",
        "tech": "base",
        # ... all themes now default to "base" for better contrast
    }
    return theme_mapping.get(theme, "base")
```

## Expected Results

### Before Fix:
- Text color = Background color → Invisible text
- Poor contrast in diagrams
- Hard to read node labels

### After Fix:
- Text uses `--text-color` (dark) 
- Node backgrounds use `--secondary-color` (light)
- Clear contrast and readable text
- Proper borders and spacing

## Files Modified
- `Backend/app/services/llm.py` - Mermaid theme configuration and CSS

## Test the Fix
1. Generate a 4K image with a mermaid diagram
2. Verify that:
   - Node text is clearly visible
   - Background and text have good contrast
   - Edge labels are readable
   - Font size is properly scaled for 4K

---

**Status**: 🟢 **CONTRAST FIX APPLIED** - Diagrams should now have readable text
