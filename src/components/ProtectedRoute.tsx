/**
 * Protected Route Component
 * Melindungi routes yang memerlukan authentication.
 * Session diperiksa di frontend saja (sessionValidUntil): setelah jam 00:00 user harus login lagi.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isSessionValid, clearAuthStorage } from '../utils/sessionAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isSessionValid()) {
        clearAuthStorage();
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
