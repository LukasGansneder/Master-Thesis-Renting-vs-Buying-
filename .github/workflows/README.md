# GitHub Actions Workflows

## deploy-visualization.yml

This workflow automatically builds and deploys the Vite visualization app to GitHub Pages whenever changes are pushed to the `visualization/` folder.

### Triggers
- Push to `main` or `copilot/add-visualization-folder` branches with changes in `visualization/**`
- Manual workflow dispatch

### Setup Requirements

To enable GitHub Pages deployment, you need to configure the repository settings:

1. Go to **Settings** → **Pages** in your GitHub repository
2. Under **Source**, select **GitHub Actions**
3. The site will be available at: `https://<username>.github.io/Master-Thesis-Renting-vs-Buying-/`

### How it Works

1. **Build Job**: 
   - Checks out the code
   - Sets up Node.js 20
   - Installs dependencies from `visualization/package-lock.json`
   - Runs `npm run build` to create production build
   - Uploads the `dist` folder as an artifact

2. **Deploy Job**:
   - Takes the build artifact
   - Deploys it to GitHub Pages
   - Outputs the deployment URL

### Base Path Configuration

The Vite config is set to use `/Master-Thesis-Renting-vs-Buying-/` as the base path in production, which matches the GitHub Pages URL structure.
