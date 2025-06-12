# Video Generation 4K Scaling Fix

## Problem Description
When users select 4K resolution (3840×2160) for video generation, the text and diagrams in the generated images appear too small to read. However, when they select 720p (1280×720), the content looks good on screen but has lower quality on large displays.

## Root Cause
The previous implementation used a fixed 720p viewport and then upscaled the image to 4K, which maintained the small text size from 720p. This approach led to:

- **4K Resolution**: Text was 720p-sized but stretched to 4K dimensions → Too small to read
- **720p Resolution**: Text was properly sized for 720p but pixelated on large screens

## Solution Implemented

### 1. Smart Scaling System
```python
# Calculate resolution scale factor relative to 720p baseline
base_width = 1280  # 720p baseline
base_height = 720
resolution_scale = min(width / base_width, height / base_height)

# Scale text proportionally to resolution for optimal readability
base_font_size = max(1.0, 0.8 + (resolution_scale * 0.4))
mermaid_font_size = int(12 + (resolution_scale * 6))
padding = int(20 + (resolution_scale * 15))
```

### 2. Native Resolution Rendering
Instead of rendering at 720p and upscaling, we now:
- Set browser viewport to the target resolution directly
- Apply resolution-appropriate font scaling in CSS
- Take screenshot at native resolution

### 3. Scaling Results

| Resolution | Scale Factor | Font Size | Mermaid Font | Readability |
|------------|--------------|-----------|--------------|-------------|
| 720p       | 1.00x       | 1.20em    | 18px         | ✅ Good     |
| 1080p      | 1.50x       | 1.40em    | 21px         | ✅ Good     |
| 4K         | 3.00x       | 2.00em    | 30px         | 🔍 Large    |

## Changes Made

### Modified Files
- `Backend/app/services/llm.py` - Updated `markdown_to_image` method

### Key Changes
1. **Smart font scaling**: Text size scales with resolution
2. **Native resolution rendering**: No more upscaling artifacts  
3. **Proportional spacing**: Padding and margins scale appropriately
4. **Mermaid diagram scaling**: Diagram text scales with resolution

## Expected Results

### Before Fix
- **4K**: Text too small, diagrams unreadable
- **720p**: Good readability but pixelated on large screens

### After Fix  
- **4K**: Large, readable text and diagrams, crisp quality
- **720p**: Same good readability as before, unchanged experience

## Technical Details

The fix maintains backward compatibility - 720p videos will look exactly the same as before, while 4K videos will now have properly scaled, readable content.

The scaling is applied at HTML/CSS level before browser rendering, ensuring crisp text rendering at the target resolution rather than pixelated upscaling.
