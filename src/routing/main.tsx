import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from '../pages/Login.tsx';
import Register from '../pages/Register.tsx';
import Home from '../pages/Home.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import DaftarRFID from '../pages/DaftarRFID.tsx';
import MonitoringRFID from '../pages/MonitoringRFID.tsx';
import DataRFID from '../pages/DataRFID.tsx';
import LineDetail from '../pages/LineDetail.tsx';
import DashboardRFID from '../pages/DashboardRFID.tsx';
import CheckingRFID from '../pages/CheckingRFID.tsx';
import StatusRFID from '../pages/StatusRFID.tsx';
import ListRFID from '../pages/ListRFID.tsx';
import AboutUs from '../pages/AboutUs.tsx';
import RFIDTracking from '../pages/RFIDTracking.tsx';
import Finishing from '../pages/Finishing.tsx';
import DashboardRFIDFinishing from '../pages/DashboardRFIDFinishing.tsx';
import RejectRoom from '../pages/RejectRoom.tsx';
import DashboardRFIDReject from '../pages/DashboardRFIDReject.tsx';
import ListRFIDReject from '../pages/ListRFIDReject.tsx';
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
        path: '/register',
        element: <Register />,
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
        path: '/rfid-tracking',
        element: (
            <ProtectedRoute>
                <RFIDTracking />
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
    {
        path: '/status-rfid',
        element: (
            <ProtectedRoute>
                <StatusRFID />
            </ProtectedRoute>
        ),
    },
    {
        path: '/list-rfid',
        element: (
            <ProtectedRoute>
                <ListRFID />
            </ProtectedRoute>
        ),
    },
    {
        path: '/list-rfid/:id',
        element: (
            <ProtectedRoute>
                <ListRFID />
            </ProtectedRoute>
        ),
    },
    {
        path: '/about-us',
        element: (
            <ProtectedRoute>
                <AboutUs />
            </ProtectedRoute>
        ),
    },
    {
        path: '/finishing',
        element: (
            <ProtectedRoute>
                <Finishing />
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-rfid-finishing',
        element: (
            <ProtectedRoute>
                <DashboardRFIDFinishing />
            </ProtectedRoute>
        ),
    },
    {
        path: '/reject-room',
        element: (
            <ProtectedRoute>
                <RejectRoom />
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-rfid-reject',
        element: (
            <ProtectedRoute>
                <DashboardRFIDReject />
            </ProtectedRoute>
        ),
    },
    {
        path: '/list-rfid-reject',
        element: (
            <ProtectedRoute>
                <ListRFIDReject />
            </ProtectedRoute>
        ),
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}

