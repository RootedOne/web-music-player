# Sepatifay

**A premium, minimal, glassmorphic music streaming platform for the modern web.**

Sepatifay is a full-stack, responsive web application designed to bring the sleek aesthetics of Apple Music and Spotify straight to your browser. Featuring a beautiful dark-mode glassmorphism UI, a persistent global audio player that seamlessly continues playback across page navigations, and powerful local music management, Sepatifay is the ultimate self-hosted audio experience.

### Key Features
*   **Persistent Global Audio:** Your music never stops, even when you browse between playlists, library, or discovery pages.
*   **Premium Glassmorphism UI:** A sleek, responsive, Apple Music-inspired dark theme that looks stunning on desktop and mobile.
*   **Advanced Track Management:** Drag-and-drop multiple `.mp3` or `.wav` files at once. The backend automatically extracts ID3 metadata (Title, Artist, Album, Cover Art) and features built-in fuzzy deduplication.
*   **Dynamic Playlists:** Create, delete, subscribe to, and clone playlists. Easily add or remove tracks with smooth UI interactions.
*   **Case-Insensitive Authentication:** Secure user registration and login utilizing NextAuth.js and bcrypt, with smart case-handling.
*   **Global Radio & Discovery:** Shuffle tracks universally or discover new music uploaded by other users on the platform.
*   **Shareable Links:** Generate dynamic, shareable URLs for your custom playlists.
*   **ZIP Downloads:** Download entire playlists with a single click.

---

## Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router), React |
| **Styling** | Tailwind CSS (Dark Mode, Glassmorphism, Headless UI) |
| **State Management** | Zustand (Global Audio & Player State) |
| **Backend API** | Next.js Route Handlers |
| **Database ORM** | Prisma Client |
| **Database Engine** | SQLite (Zero-config local file: `prisma/dev.db`) |
| **Authentication** | NextAuth.js (Credentials Provider) |
| **Audio Processing** | `music-metadata` (ID3 Tag parsing) |

---

## How to Install on Ubuntu (0 to 100)

Follow this step-by-step guide to get Sepatifay running on a fresh Ubuntu environment.

### 1. Update your system
Before installing new software, ensure your package lists are up to date:
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js & npm (via NVM)
The recommended way to install Node.js is using the Node Version Manager (NVM). This allows you to easily manage Node versions.

Install NVM:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
*(After running this, close and reopen your terminal, or run `source ~/.bashrc` to apply the changes).*

Install the latest LTS version of Node.js:
```bash
nvm install --lts
nvm use --lts
```
Verify the installation:
```bash
node -v
npm -v
```

### 3. Clone the Repository
Clone the Sepatifay project to your local machine:
```bash
git clone https://github.com/[Your-Username]/sepatifay.git
cd sepatifay
```

### 4. Install Dependencies
Install all the required frontend and backend packages:
```bash
npm install
```

### 5. Setup Environment Variables
Sepatifay uses environment variables to manage sensitive keys.

Create your `.env` file from the example:
```bash
cp .env.example .env
```
Open `.env` in your preferred editor (e.g., `nano .env`) and configure the variables. You will need to generate a secure secret for NextAuth:
```bash
# Generate a secret key by running this in your terminal:
# openssl rand -base64 32

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_generated_secret_here"
```

### 6. Initialize the Database
Since Sepatifay uses Prisma with SQLite, you need to generate the Prisma client and push the schema to create your local `dev.db` file:
```bash
npx prisma generate
npx prisma db push
```

### 7. Run the Development Server
Start the Next.js development server:
```bash
npm run dev
```
🎉 **Success!** You can now open your browser and navigate to `http://localhost:3000` to enjoy Sepatifay.

### Optional: Build for Production
If you want to run the app in a highly optimized production environment, build the application first, then start it:
```bash
npm run build
npm start
```
*(Note: You can use tools like `pm2` to keep the production server running in the background).*

---

## Author

**[Your Name]**
*   GitHub: [@YourGitHubUsername](https://github.com/[Your-GitHub-Username])
*   Portfolio: [Your Portfolio URL]
*   Twitter/X: [@YourTwitterHandle]
