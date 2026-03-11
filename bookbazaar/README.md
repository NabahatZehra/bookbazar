# BookBazaar

An online second-hand book resale marketplace using a C2C commission-based model.

## Features
- User Authentication (JWT)
- Role-based Access (Buyer, Seller, Admin)
- Book Listings, Filtering, and Details
- Shopping Cart & Checkout (Stripe)
- Real-time Chat (Socket.io)
- Photo Uploads (Cloudinary + Multer)
- Seller & Admin Dashboards

## Setup

1. **Install Dependencies**
   Run the following from the root directory to install both client and server dependencies:
   ```bash
   npm run install-all
   ```

2. **Environment Variables**
   - Navigate to the `server` directory.
   - Copy `.env.example` to `.env`.
   - Update the values with your actual API keys and MongoDB connection string.

3. **Run Application**
   From the root directory:
   ```bash
   npm run dev
   ```
   This will start both the Express backend and the Vite frontend concurrently.

## Tech Stack
- Frontend: React, Vite, TailwindCSS, React Router v6, Socket.io-client
- Backend: Node.js, Express.js, MongoDB + Mongoose, Socket.io
