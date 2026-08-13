# ContactQube Admin Panel

A modern, responsive Web Admin Portal for managing the **ContactQube** platform. Built with **React 19**, **Vite**, **Ant Design (antd)**, **Recharts**, and **Lucide Icons**.

---

## 🚀 Features

- **Dashboard & Analytics**: Dynamic metrics overview, growth charts powered by `recharts`, and business KPIs.
- **Member Management**: Comprehensive list views, profile details, user subscription management, and search/filters.
- **Role-Based Access Control (RBAC)**: Manage user roles, module permissions, and access levels (`UserRoles.jsx`, `permission.js`).
- **Activities & Interactions**: Monitor platform activities, event attendees, and contact interactions (`Activities.jsx`, `Interactions.jsx`).
- **Subscription Plans**: Create, update, and manage pricing/membership plans (`Plans.jsx`).
- **Banner Management**: Upload and manage promotional mobile app banners (`Banners.jsx`).
- **Reports & Analytics**: Financial exports, membership reports, and login histories (`Reports.jsx`).
- **Secure Authentication**: PIN/Password login, session persistence via JWT, and protected routes (`ProtectedRoute.jsx`).

---

## 🛠️ Tech Stack

- **Framework / Library**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite (`@vitejs/plugin-react`)
- **UI Components**: Ant Design (`antd`), Lucide Icons (`lucide-react`)
- **Routing**: React Router DOM v6 (`react-router-dom`)
- **HTTP Client**: Axios (`axios`) with interceptors for JWT injection & 401 redirect handling
- **Charts & Data Viz**: Recharts (`recharts`)
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Linting**: ESLint 10

---

## 📁 Directory Structure

```text
contactqube-admin/
├── index.html                 # HTML entry template
├── vite.config.js             # Vite configuration
├── vercel.json                # Vercel deployment configuration
├── package.json               # Dependencies & scripts
└── src/                       # Source code root
    ├── main.jsx               # React DOM rendering entry point
    ├── App.jsx                # Application routing configuration
    ├── Api/                   # Axios API service modules
    │   ├── activitiesApi.js
    │   ├── bannerApi.js
    │   ├── dashboardApi.js
    │   ├── membersApi.js
    │   ├── plansApi.js
    │   ├── reportsApi.js
    │   └── roleApi.js
    ├── components/            # Reusable UI components
    │   ├── Layout.jsx         # Main dashboard layout wrapper
    │   ├── Navbar.jsx         # Header navigation bar
    │   ├── Sidebar.jsx        # Side navigation menu
    │   └── ProtectedRoute.jsx # Auth & RBAC guard
    ├── config/                # Environment-based API base URL config (`index.js`)
    ├── pages/                 # Admin Dashboard Pages
    │   ├── Dashboard.jsx
    │   ├── Members.jsx
    │   ├── UserRoles.jsx
    │   ├── Activities.jsx
    │   ├── Plans.jsx
    │   ├── Banners.jsx
    │   └── Reports.jsx
    └── utils/                 # Formatting & RBAC permission helpers (`permission.js`)
```

---

## ⚙️ Environment Configuration

The admin panel connects to the backend REST API based on `VITE_APP_ENV` (configured in `src/config/index.js`):

- **`local` / default**: `http://localhost:5000/api/admin`
- **`dev`**: `https://net-worth-backend.onrender.com/api/admin`
- **`production`**: `https://api.contactqube.com/api/admin`

You can specify the environment when running or building using a `.env` file or environment flags:

```env
VITE_APP_ENV=local
```

---

## 💻 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
> Opens the development app at `http://localhost:5173`. Ensure the backend server is running on `http://localhost:5000`.

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

---

## 📄 License

This repository is maintained for ContactQube.
