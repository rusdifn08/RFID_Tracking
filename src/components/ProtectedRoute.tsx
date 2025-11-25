/**
 * Protected Route Component
 * Melindungi routes yang memerlukan authentication
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    // Jika belum login, redirect ke login dengan returnUrl
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Jika sudah login, render children
    return <>{children}</>;
}

