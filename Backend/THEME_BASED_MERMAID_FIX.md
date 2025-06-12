# 🎨 THEME-BASED MERMAID CONTRAST FIX

## Problem
The text inside mermaid diagrams has the same color as the background, making it invisible.

## Solution Applied - Using Theme Colors Only

### 1. Enhanced CSS Selectors (Theme-Based)
Updated CSS to target all mermaid text elements while using theme colors:

```css
/* All text elements use theme text color */
.mermaid svg text,
.mermaid svg .nodeLabel,
.mermaid svg .edgeLabel text,
.mermaid svg .label,
.mermaid svg tspan {
    fill: var(--text-color) !important;
    font-weight: 600 !important;
}

/* Node backgrounds use theme background color for contrast */
.mermaid svg .node rect,
.mermaid svg rect,
/* ... other shapes */ {
    fill: var(--background-color) !important;
    stroke: var(--border-color) !important;
}

/* Edge labels use theme secondary color */
.mermaid svg .edgeLabel {
    fill: var(--secondary-color) !important;
    color: var(--text-color) !important;
}
```

### 2. Improved Mermaid Theme Variables Mapping
Updated theme variable mapping for better contrast using theme colors:

```javascript
themeVariables: {
    primaryColor: '{{background_color}}',      // Light background for nodes (NOT secondary)
    primaryTextColor: '{{text_color}}',        // Dark text on nodes
    primaryBorderColor: '{{border_color}}',    // Border color
    textColor: '{{text_color}}',              // All text elements
    nodeTextColor: '{{text_color}}',          // Node text specifically
    edgeLabelBackground: '{{secondary_color}}', // Edge label backgrounds
    // ... all other mappings use theme colors
}
```

### 3. Key Changes for Contrast

**Before (Poor Contrast):**
- Node background: `secondary_color` (often grayish)
- Text color: `text_color` (often dark)
- Result: Similar colors = invisible text

**After (Good Contrast):**
- Node background: `background_color` (usually white/light)
- Text color: `text_color` (usually dark)
- Result: Light nodes + dark text = high contrast

## Theme Color Relationships

The fix ensures proper contrast by using:
- **Node backgrounds**: `background_color` (lightest theme color)
- **Text**: `text_color` (darkest theme color)  
- **Borders**: `border_color` (medium theme color)
- **Edge labels**: `secondary_color` (medium-light theme color)

## Expected Results

### All Themes:
- ✅ **Modern**: White nodes + dark text
- ✅ **Professional**: Light nodes + dark text  
- ✅ **Tech**: Light nodes + dark text
- ✅ **Custom**: Uses custom background + text colors

### Scaling + Contrast:
- ✅ **720p**: Readable text at normal size
- ✅ **4K**: Readable text at 3x larger size
- ✅ **All resolutions**: Proper contrast maintained

## Files Modified
- `Backend/app/services/llm.py` - Enhanced CSS selectors and theme variable mapping

---

**Status**: 🟢 **THEME-BASED CONTRAST FIX APPLIED** 
**All colors come from theme system - no hardcoded values!**
