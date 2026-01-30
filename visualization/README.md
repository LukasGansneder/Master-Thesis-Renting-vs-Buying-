# Germany Rent vs. Buy Heatmap Visualization

This is a Vite + React application that visualizes the NPV scores for renting vs. buying across German regions.

## Features

- Interactive map of Germany showing regional rent vs. buy scores
- Year selector to view data across different years (2004-2025)
- Color-coded markers: green (buying favorable), red (renting favorable), yellow (neutral)
- Popup details for each region showing score and recommendation
- Statistics dashboard showing count of regions in each category

## Tech Stack

- **Vite** - Fast build tool and dev server
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Leaflet & React-Leaflet** - Interactive maps
- **D3.js** - Data processing and color scales

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Data Sources

- `public/data/export_score.csv` - Regional NPV scores by year
- `public/data/Gemeinden_coordinates.csv` - Geographic coordinates for regions

## Score Interpretation

- **Score > 0.5**: Buying is favorable
- **Score -0.5 to 0.5**: Neutral
- **Score < -0.5**: Renting is favorable

The score represents the NPV (Net Present Value) advantage of buying vs. renting in each region.
