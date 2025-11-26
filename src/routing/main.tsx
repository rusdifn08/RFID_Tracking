import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from '../pages/Login.tsx';
import Home from '../pages/Home.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import DaftarRFID from '../pages/DaftarRFID.tsx';
import MonitoringRFID from '../pages/MonitoringRFID.tsx';
import DataRFID from '../pages/DataRFID.tsx';
import LineDetail from '../pages/LineDetail.tsx';
import DashboardRFID from '../pages/DashboardRFID.tsx';
import CheckingRFID from '../pages/CheckingRFID.tsx';
import ProtectedRoute from '../components/ProtectedRoute';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/home" replace />,
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/home',
        element: (
            <ProtectedRoute>
                <Home />
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <Dashboard />
            </ProtectedRoute>
        ),
    },
    {
        path: '/daftar-rfid',
        element: (
            <ProtectedRoute>
                <DaftarRFID />
            </ProtectedRoute>
        ),
    },
    {
        path: '/monitoring-rfid',
        element: (
            <ProtectedRoute>
                <MonitoringRFID />
            </ProtectedRoute>
        ),
    },
    {
        path: '/data-rfid',
        element: (
            <ProtectedRoute>
                <DataRFID />
            </ProtectedRoute>
        ),
    },
    {
        path: '/line/:id',
        element: (
            <ProtectedRoute>
                <LineDetail />
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-rfid/:id',
        element: (
            <ProtectedRoute>
                <DashboardRFID />
            </ProtectedRoute>
        ),
    },
    {
        path: '/checking-rfid',
        element: (
            <ProtectedRoute>
                <CheckingRFID />
            </ProtectedRoute>
        ),
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}

