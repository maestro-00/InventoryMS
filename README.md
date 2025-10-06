# InventoryMS 

InventoryMS is a modern, full-featured inventory management system built with React, TypeScript, and TailwindCSS. Manage your inventory, track sales, and analyze business performance with an intuitive interface.

## Features

- **Authentication** - Secure cookie-based authentication with client-side validation
- **Dashboard** - Real-time overview of inventory stats and sales metrics
- **Inventory Management** - Full CRUD operations for inventory items with image upload
- **Point of Sale (POS)** - Quick and easy sales transaction processing
- **Analytics** - Visual insights into sales trends and top-performing items
- **Modern UI** - Beautiful, responsive design with shadcn/ui components
- **API Integration** - RESTful API communication with external backend

## Tech Stack

- **Frontend Framework:** React 18 + TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **Routing:** React Router v6
- **State Management:** React Context API
- **Data Fetching:** Custom API hooks with fetch
- **Charts:** Recharts
- **Icons:** Lucide React
- **Build Tool:** Vite

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn** or **bun**
- **Git**

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/InventoryMS.git
cd InventoryMS
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your API configuration:

```env
VITE_API_BASE_URL=http://localhost:5291/api
```

**Note:** Replace the URL with your backend API endpoint.

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
bun dev
```

The application will start at `http://localhost:5173` (or another available port).

### 5. Build for Production

```bash
npm run build
# or
yarn build
# or
bun run build
```

The production-ready files will be in the `dist` directory.

### 6. Preview Production Build

```bash
npm run preview
# or
yarn preview
# or
bun preview
```

## Backend Integration

This is the frontend application. For the complete system, you need to set up the backend API.

**Backend Repository:** [InventoryX](https://github.com/maestro-00/InventoryX)

### API Endpoints Required

The frontend expects the following API endpoints:

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/pingauth` - Check authentication status

#### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `POST /api/inventory/upload-image` - Upload item image

#### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create new sale
- `GET /api/sales/stats` - Get sales statistics
- `GET /api/sales/today` - Get today's sales

#### Analytics
- `GET /api/analytics/overview` - Get analytics overview
- `GET /api/analytics/revenue` - Get revenue data
- `GET /api/analytics/top-items` - Get top selling items

## Project Structure

```
InventoryMS/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── ui/         # shadcn/ui components
│   │   └── Layout.tsx  # Main layout wrapper
│   ├── config/         # Configuration files
│   │   └── api.ts      # API endpoints configuration
│   ├── contexts/       # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/          # Custom React hooks
│   │   └── use-api.ts  # API communication hook
│   ├── pages/          # Page components
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Inventory.tsx
│   │   ├── POS.tsx
│   │   └── Analytics.tsx
│   ├── services/       # API service layers
│   │   ├── authService.ts
│   │   ├── inventoryService.ts
│   │   ├── salesService.ts
│   │   └── analyticsService.ts
│   ├── lib/            # Utility functions
│   ├── App.tsx         # Root component
│   └── main.tsx        # Entry point
├── .env.example        # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## Key Features Explained

### Cookie-Based Authentication
The application uses HTTP-only cookies for authentication, providing better security than JWT tokens stored in localStorage.

### Dynamic API Hook
The custom `useApi` hook supports:
- Dynamic query parameters
- Dynamic path parameters
- Automatic error handling
- Request timeout management
- Cookie credentials

### Client-Side Validation
Password validation with real-time feedback:
- Minimum 6 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one digit
- At least one special character

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- UI components built with [shadcn/ui](https://ui.shadcn.com/)
- Design inspiration from [TailAdmin](https://tailadmin.com/)
- Icons by [Lucide](https://lucide.dev/)

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the [CONTRIBUTING.md](./CONTRIBUTING.md) guide

## Roadmap

- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Export reports (PDF/Excel)
- [ ] Barcode scanning
- [ ] Email notifications
- [ ] Advanced filtering and search
- [ ] Batch operations
- [ ] Mobile app version

---

**Built with ❤️ using React + TypeScript**
