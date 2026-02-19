<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Pomelli - AI-Powered Design Editor

A professional mobile-first design editor with AI-powered brand analysis and campaign generation. Create stunning social media campaigns with intelligent brand DNA extraction and multi-page design workflows.

## Features

### Business DNA Generator
- Analyze any website by URL
- Automatic screenshot capture and brand analysis
- Extract brand colors, fonts, values, tone of voice, and aesthetic
- Upload logo and brand images
- Edit and refine brand identity in real-time
- Bento grid layout with editable sections

### Campaign Ideas Generator
- Create multi-page campaigns (1-5 pages)
- AI-powered design generation based on prompts
- Optional: Use saved Business DNA for brand-consistent designs
- Real-time preview and editing

### Advanced Editor
- Multi-page design support
- Drag-and-drop element manipulation
- Text, shapes, and image elements
- Custom font upload and management
- Font configuration system (download/upload font packs)
- Theme color palette management
- Layer reordering and organization
- Responsive design (mobile, tablet, desktop)

### Data Persistence
- Firebase Authentication (Google Sign-In)
- Real-time database synchronization
- Save and manage multiple Business DNA profiles
- Save and manage multiple campaigns
- Automatic design auto-save
- Images stored as base64 in Firebase

### Font Management
- 30+ pre-loaded Google Fonts
- Upload custom fonts (TTF, OTF, WOFF, WOFF2)
- Font configuration system:
  - Download all fonts as ZIP
  - Upload ZIP to replace Google Fonts with local versions
  - Fonts stored in IndexedDB for offline use
- Font preview in real-time

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

## Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Backend:** Firebase (Auth + Realtime Database)
- **AI:** Google Gemini API
- **Storage:** IndexedDB (fonts, images)
- **Build:** Vite
- **PWA:** Offline support with service workers

## How It Works

1. **Home Page:** Choose between Generate Business DNA, Get Campaign Ideas, or access Dashboard
2. **Business DNA:** Input URL → Screenshot capture → AI analysis → Editable brand profile
3. **Campaign Ideas:** Input prompt → Select pages → Optional DNA → AI generates designs → Editor
4. **Dashboard:** View and manage all saved DNA profiles and campaigns
5. **Editor:** Full-featured design editor with live preview and auto-save

## Tech Stack

- React 19
- TypeScript
- Firebase (Auth + Realtime DB)
- Google Gemini API
- IndexedDB
- JSZip (font management)
- Tailwind CSS
- Vite
- PWA Support
