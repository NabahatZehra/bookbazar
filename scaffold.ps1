$ErrorActionPreference = "Stop"

$base = "bookbazaar"
New-Item -ItemType Directory -Force -Path $base | Out-Null

# Server directories
$serverDirs = @(
    "server/config",
    "server/controllers",
    "server/middleware",
    "server/models",
    "server/routes",
    "server/sockets",
    "server/utils"
)
foreach ($dir in $serverDirs) { New-Item -ItemType Directory -Force -Path "$base/$dir" | Out-Null }

# Server files
$serverFiles = @(
    "server/server.js",
    "server/config/db.js",
    "server/config/cloudinary.js",
    "server/config/stripe.js",
    "server/controllers/authController.js",
    "server/controllers/bookController.js",
    "server/controllers/orderController.js",
    "server/controllers/adminController.js",
    "server/controllers/chatController.js",
    "server/controllers/reviewController.js",
    "server/middleware/authMiddleware.js",
    "server/middleware/adminMiddleware.js",
    "server/middleware/errorHandler.js",
    "server/models/User.js",
    "server/models/Book.js",
    "server/models/Order.js",
    "server/models/Message.js",
    "server/models/Review.js",
    "server/routes/authRoutes.js",
    "server/routes/bookRoutes.js",
    "server/routes/orderRoutes.js",
    "server/routes/adminRoutes.js",
    "server/routes/chatRoutes.js",
    "server/sockets/chatSocket.js",
    "server/utils/generateToken.js",
    "server/utils/commissionCalculator.js"
)
foreach ($file in $serverFiles) { New-Item -ItemType File -Force -Path "$base/$file" | Out-Null }

# Client directories
$clientDirs = @(
    "client/public",
    "client/src/assets",
    "client/src/components/common",
    "client/src/components/book",
    "client/src/components/chat",
    "client/src/components/dashboard",
    "client/src/pages",
    "client/src/context",
    "client/src/hooks",
    "client/src/services",
    "client/src/utils"
)
foreach ($dir in $clientDirs) { New-Item -ItemType Directory -Force -Path "$base/$dir" | Out-Null }

# Client files
$clientFiles = @(
    "client/src/components/common/Navbar.jsx",
    "client/src/components/common/Footer.jsx",
    "client/src/components/common/Loader.jsx",
    "client/src/components/common/ProtectedRoute.jsx",
    "client/src/components/book/BookCard.jsx",
    "client/src/components/book/BookGrid.jsx",
    "client/src/components/book/BookFilter.jsx",
    "client/src/components/chat/ChatBox.jsx",
    "client/src/components/chat/MessageBubble.jsx",
    "client/src/components/dashboard/SellerStats.jsx",
    "client/src/components/dashboard/EarningsChart.jsx",
    "client/src/pages/Home.jsx",
    "client/src/pages/BookDetails.jsx",
    "client/src/pages/AddBook.jsx",
    "client/src/pages/Cart.jsx",
    "client/src/pages/Checkout.jsx",
    "client/src/pages/SellerDashboard.jsx",
    "client/src/pages/AdminDashboard.jsx",
    "client/src/pages/ChatPage.jsx",
    "client/src/pages/Login.jsx",
    "client/src/pages/Register.jsx",
    "client/src/pages/NotFound.jsx",
    "client/src/context/AuthContext.jsx",
    "client/src/context/CartContext.jsx",
    "client/src/context/SocketContext.jsx",
    "client/src/hooks/useAuth.js",
    "client/src/hooks/useCart.js",
    "client/src/hooks/useFetch.js",
    "client/src/services/api.js",
    "client/src/utils/commission.js",
    "client/src/utils/formatCurrency.js",
    "client/src/App.jsx",
    "client/src/main.jsx",
    "client/index.html"
)
foreach ($file in $clientFiles) { New-Item -ItemType File -Force -Path "$base/$file" | Out-Null }

Write-Output "Scaffolding complete."
