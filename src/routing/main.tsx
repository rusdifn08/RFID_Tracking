import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';

// Lazy load semua pages untuk code splitting
const Login = lazy(() => import('../pages/Login.tsx'));
const Register = lazy(() => import('../pages/Register.tsx'));
const Home = lazy(() => import('../pages/Home.tsx'));
const Dashboard = lazy(() => import('../pages/Dashboard.tsx'));
const DaftarRFID = lazy(() => import('../pages/DaftarRFID.tsx'));
const MonitoringRFID = lazy(() => import('../pages/MonitoringRFID.tsx'));
const DataRFID = lazy(() => import('../pages/DataRFID.tsx'));
const LineDetail = lazy(() => import('../pages/LineDetail.tsx'));
const DashboardRFID = lazy(() => import('../pages/DashboardRFID.tsx'));
const CheckingRFID = lazy(() => import('../pages/CheckingRFID.tsx'));
const StatusRFID = lazy(() => import('../pages/StatusRFID.tsx'));
const ListRFID = lazy(() => import('../pages/ListRFID.tsx'));
const AboutUs = lazy(() => import('../pages/AboutUs.tsx'));
const RFIDTracking = lazy(() => import('../pages/RFIDTracking.tsx'));
const Finishing = lazy(() => import('../pages/Finishing.tsx'));
const DashboardRFIDFinishing = lazy(() => import('../pages/DashboardRFIDFinishing.tsx'));
const DashboardDetailFinishing = lazy(() => import('../pages/DashboardDetailFinishing.tsx'));
const DashboardDryroom = lazy(() => import('../pages/DashboardDryroom.tsx'));
const DashboardFolding = lazy(() => import('../pages/DashboardFolding.tsx'));
const RejectRoom = lazy(() => import('../pages/RejectRoom.tsx'));
const DashboardRFIDReject = lazy(() => import('../pages/DashboardRFIDReject.tsx'));
const ListRFIDReject = lazy(() => import('../pages/ListRFIDReject.tsx'));
const AllProductionLineDashboard = lazy(() => import('../pages/AllProductionLineDashboard.tsx'));
const ProductionTrackingTime = lazy(() => import('../pages/ProductionTrackingTime.tsx'));
const FormData = lazy(() => import('../pages/FormData.tsx'));
const NeedelManagerHub = lazy(() => import('../pages/NeedelManagerHub.tsx'));
const NeedelManager = lazy(() => import('../pages/NeedelManager.tsx'));
const DashboardMesinKolam = lazy(() => import('../pages/DashboardMesinKolam.tsx'));
const Cutting = lazy(() => import('../pages/Cutting.tsx'));
const DashboardCutting = lazy(() => import('../pages/DashboardCutting.tsx'));
const SewingLine = lazy(() => import('../pages/SewingLine.tsx'));
const DashboardSewingLine = lazy(() => import('../pages/DashboardSewingLine.tsx'));

// Loading component untuk Suspense (ringan agar paint cepat)
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-50" aria-busy="true">
        <div className="text-center">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Memuat halaman...</p>
        </div>
    </div>
);

// Wrapper untuk lazy loaded components dengan Suspense
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<PageLoader />}>
        {children}
    </Suspense>
);

const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/home" replace />,
    },
    {
        path: '/login',
        element: (
            <LazyWrapper>
                <Login />
            </LazyWrapper>
        ),
    },
    {
        path: '/register',
        element: (
            <LazyWrapper>
                <Register />
            </LazyWrapper>
        ),
    },
    {
        path: '/home',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <Home />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <Dashboard />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/daftar-rfid',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DaftarRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/rfid-tracking',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <RFIDTracking />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/cutting',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <Cutting />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-cutting',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardCutting />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/sewing',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <SewingLine />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-sewing-line',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardSewingLine />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/sewing/line/:id',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <LineDetail />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/sewing/all',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <AllProductionLineDashboard />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/monitoring-rfid',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <MonitoringRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/data-rfid',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DataRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/line/:id',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <LineDetail />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-rfid/:id',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/checking-rfid',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <CheckingRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/status-rfid',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <StatusRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/list-rfid',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <ListRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/list-rfid/:id',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <ListRFID />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/about-us',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <AboutUs />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/finishing',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <Finishing />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-rfid-finishing',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardRFIDFinishing />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-detail-finishing',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardDetailFinishing />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-dryroom',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardDryroom />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-folding',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardFolding />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/reject-room',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <RejectRoom />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/dashboard-rfid-reject',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardRFIDReject />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/list-rfid-reject',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <ListRFIDReject />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/all-production-line',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <AllProductionLineDashboard />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/production-tracking-time',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <ProductionTrackingTime />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/form-data',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <FormData />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/form-report',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <FormData />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/needel-manager',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <NeedelManagerHub />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/needel-manager/monitoring',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <NeedelManager />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
    {
        path: '/needel-manager/mesin-kolam',
        element: (
            <ProtectedRoute>
                <LazyWrapper>
                    <DashboardMesinKolam />
                </LazyWrapper>
            </ProtectedRoute>
        ),
    },
]);

export default function AppRouter() {
    return <RouterProvider router={router} />;
}

