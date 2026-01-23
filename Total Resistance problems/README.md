# Resistor: Front-Facing 3D Plane

This folder contains a minimal Three.js demo that renders a 3D plane like a laptop screen facing you directly (no tilt). The plane is in the XY plane with its normal pointing toward +Z, and the camera is placed on the +Z axis, looking straight at the origin.

## How to run (Windows)

You can open the HTML file directly; it uses the UMD build of Three.js (no dev server required):

1. Open File Explorer and navigate to `C:\With deepseek\Resistor`.
2. Double‑click `index.html` to open it in your default browser.

If you prefer a local server (e.g., to avoid any browser security restrictions):

- Using VS Code Live Server extension: Right‑click `index.html` → "Open with Live Server".
- Using PowerShell with a quick Python server (optional, requires Python installed):

```powershell
# Start a simple local server on http://localhost:8000
# Run this from the Resistor folder
python -m http.server 8000
```

Then visit `http://localhost:8000/index.html`.

## Controls

- The view is locked to be straight by default. Press `R` to reset the camera to the front, centered view.

## Notes

- The plane uses a 16:9 size ratio (1.6 × 0.9) for a laptop‑screen feel.
- Lighting is not required; a MeshBasicMaterial is used so the color is constant.
- Resize the browser window and the scene will adapt to remain full screen.
