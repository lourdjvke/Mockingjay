<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Mockingjay Design Editor

A high-fidelity visual design editor with AI-powered design generation using Google Gemini API.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your Gemini API key in `.env`:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Deploy to Cloudflare Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. Create a new Cloudflare Pages project and connect your repository

3. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Framework preset: `Vite`

4. Add environment variable in Cloudflare Pages dashboard:
   - Variable name: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key

5. Deploy

The app uses direct REST API calls to Google Gemini, which works perfectly in browser environments and Cloudflare Pages.
