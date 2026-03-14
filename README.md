# Logic Gates & Boolean Algebra Toolkit

An interactive, feature-rich Logic Gates website with dark mode UI. Includes a Boolean Algebra Simplifier, KMap Solver, Logic Gate Simulator, and Learning Resources.

## Live Demo
Deploy instantly on Vercel or GitHub Pages.

## Features
- 🧮 **Boolean Algebra Solver** — step-by-step simplification using Quine-McCluskey + Boolean laws
- 🗺️ **K-Map Solver** — 2/3/4 variable Karnaugh Maps with Don't Care support
- ⚡ **Logic Gate Simulator** — drag & drop canvas with live evaluation (AND, OR, NOT, NAND, NOR, XOR, XNOR)
- 📚 **Learning Resources** — Boolean laws, gate truth tables, K-Map guide

## Tech Stack
- Pure HTML / CSS / JavaScript — no frameworks, no build step
- Google Fonts (Inter + JetBrains Mono)
- Font Awesome icons
- Canvas API for the gate simulator

## Running Locally
Just open `index.html` in any browser — no server needed.

## Deploy to Vercel
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com), click **New Project**
3. Import your GitHub repo
4. Click **Deploy** — that's it! ✅

`vercel.json` is already configured for automatic static deployment.

## Deploy to GitHub Pages
1. Push to GitHub
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Your site is live at `https://<username>.github.io/<repo-name>`

## Expression Syntax
| Symbol | Meaning |
|--------|---------|
| `+`    | OR      |
| `.` or adjacency | AND |
| `!` or `'` (postfix) | NOT  |
| `()`   | Grouping |

Example: `AB+AC(A+B)` or `!A.B + A.!B`
