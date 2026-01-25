# React 3D Plane with Controls

A React application featuring a 3D plane with interactive camera controls using Three.js.

## Features

- **3D Grid Plane**: Interactive 20x20 grid surface
- **OrbitControls**: Smooth camera rotation and zoom
- **Realistic Rendering**: Environment mapping and shadow effects
- **Responsive Design**: Adapts to window resizing

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (typically `http://localhost:5173`).

### Controls

- **Left-click + Drag**: Rotate camera around the plane
- **Scroll Wheel**: Zoom in/out
- **Right-click**: Disabled (no panning)

## Technology Stack

- React 19.2.0
- Three.js 0.182.0
- Vite 7.2.4

## Project Structure

```
Activity 1.12/
├── src/
│   ├── App.jsx          # Main 3D scene component
│   ├── App.css          # Application styles
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML entry point
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```
