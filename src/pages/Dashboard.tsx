import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Dashboard() {
    const navigate = useNavigate();

    useEffect(() => {
        // Cek apakah user sudah login
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold">RFID Management System</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/daftar-rfid"
                                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Daftar RFID
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
                        <p className="text-gray-600 mb-6">
                            Selamat datang di Dashboard RFID Management System
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-800">Total RFID</h3>
                                <p className="text-2xl font-bold text-blue-600">0</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-green-800">Aktif</h3>
                                <p className="text-2xl font-bold text-green-600">0</p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-yellow-800">Nonaktif</h3>
                                <p className="text-2xl font-bold text-yellow-600">0</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

