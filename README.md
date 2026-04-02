# Sepatifay

**A premium, minimal, glassmorphic music streaming platform for the modern web.**

Sepatifay is a full-stack, responsive web application designed to bring the sleek aesthetics of Apple Music and Spotify straight to your browser. Featuring a beautiful dark-mode glassmorphism UI, a persistent global audio player that seamlessly continues playback across page navigations, and powerful local music management, Sepatifay is the ultimate self-hosted audio experience.

### Key Features
*   **Persistent Global Audio:** Your music never stops, even when you browse between playlists, library, or discovery pages.
*   **Premium Glassmorphism UI:** A sleek, responsive, Apple Music-inspired dark theme that looks stunning on desktop and mobile, with RTL/Farsi layout support.
*   **Advanced Track Management:** Drag-and-drop multiple `.mp3` or `.wav` files at once. The backend automatically extracts ID3 metadata (Title, Artist, Album, Cover Art) and features built-in fuzzy deduplication.
*   **Dynamic Playlists:** Create, delete, subscribe to, and clone playlists. Easily add or remove tracks with smooth UI interactions.
*   **Case-Insensitive Authentication:** Secure user registration and login utilizing NextAuth.js and bcrypt, with smart case-handling.
*   **Global Radio & Discovery:** Shuffle tracks universally or discover new music uploaded by other users on the platform.
*   **Admin Panel:** Protected dashboard to manage users, tracks, artists, and playlists with "Wizard" style safety locks for destructive actions.
*   **Shareable Links:** Generate dynamic, shareable URLs for your custom playlists.
*   **ZIP Downloads:** Download entire playlists with a single click using `jszip` and `file-saver`.
*   **Virtualized Lists:** Extremely performant rendering of large track libraries using `react-virtuoso`.
*   **Beautiful Notifications:** Real-time feedback with `react-hot-toast`.

---

## Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router), React 18 |
| **Styling** | Tailwind CSS (Dark Mode, Glassmorphism) |
| **UI Components** | Headless UI, Lucide React, React Icons, React Hot Toast |
| **State Management** | Zustand (Global Audio & Player State) |
| **Backend API** | Next.js Route Handlers |
| **Database ORM** | Prisma Client |
| **Database Engine** | SQLite (Zero-config local file: `prisma/dev.db`) |
| **Authentication** | NextAuth.js (Credentials Provider), HTTP Basic Auth (Admin) |
| **Audio Processing** | `music-metadata` (ID3 Tag parsing) |
| **File Handling** | `jszip`, `file-saver` (ZIP Downloads) |
| **Performance** | `react-virtuoso` (Virtualized Lists) |

---

## Installation & Requirements

To set up Sepatifay locally, follow these cross-platform instructions (Windows, macOS, Linux).

### Prerequisites
*   **Node.js**: LTS version (e.g., v18 or v20).
*   **Git**: To clone the repository.
*   **Python**: Playwright verification scripts (Optional).

### General Setup

#### 1. Clone the Repository
Clone the Sepatifay project to your local machine:
```bash
git clone https://github.com/RootedOne/sepatifay.git
cd sepatifay
```

#### 2. Install Dependencies
Install all the required packages using npm:
```bash
npm install
```

#### 3. Setup Environment Variables
Sepatifay requires specific environment variables for authentication and the admin panel.

Copy the example file to create your local `.env`:
```bash
cp .env.example .env
```
Open the `.env` file in your favorite text editor and ensure you have generated a secure secret for NextAuth:
```bash
# You can generate a random secret via terminal (or using Node):
# openssl rand -base64 32
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_generated_secret_here"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="secure_admin_password_here"
```

#### 4. Initialize the Database
Sepatifay uses Prisma with a local SQLite file. Generate the client and create the `dev.db` file:
```bash
npx prisma generate
npx prisma db push
```

#### 5. Run the Development Server
Start the Next.js application:
```bash
npm run dev
```
🎉 **Success!** Open your browser and navigate to `http://localhost:3000`.

#### Build for Production
To run in an optimized production setting, build the app first:
```bash
npm run build
npm start
```

---

### Ubuntu-Specific Setup

If you are running a fresh Ubuntu environment, you can follow these specific commands to get everything prepared before following the general steps above.

#### Update your system
```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Node.js & npm (via NVM)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
*(After running this, close and reopen your terminal, or run `source ~/.bashrc`).*
```bash
nvm install --lts
nvm use --lts
```

---

## Contact Us

Have questions, feedback, or need support? Reach out to us through any of the channels below:

*   **Email:** [Insert Email Here]
*   **Website:** [Insert Website URL Here]
*   **Twitter / X:** [Insert Handle]
*   **GitHub Issues:** [Insert Issues URL Here]

---

## Author

**RootedOne**
