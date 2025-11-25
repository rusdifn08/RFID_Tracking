/**
 * Contoh Penggunaan React Query dengan API
 * File ini menunjukkan cara menggunakan hooks untuk login dan production data
 */

import { useState } from 'react';
import { useLogin, useAuth, useLogout } from '../hooks/useAuth';
import { useProductionData, useProductionDataByLine } from '../hooks/useProductionData';

export default function ExampleUsage() {
    const [nik, setNik] = useState('');
    const [password, setPassword] = useState('');
    const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined);

    // Auth hooks
    const loginMutation = useLogin();
    const { isAuthenticated, user } = useAuth();
    const logout = useLogout();

    // Production data hooks
    const productionDataQuery = useProductionData(selectedLine);
    const line1Data = useProductionDataByLine(1);
    const line2Data = useProductionDataByLine(2);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate({ nik, password });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold mb-6">Contoh Penggunaan React Query</h1>

            {/* Login Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Login</h2>
                {!isAuthenticated ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">NIK</label>
                            <input
                                type="text"
                                value={nik}
                                onChange={(e) => setNik(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md"
                                placeholder="Masukkan NIK"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md"
                                placeholder="Masukkan Password"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loginMutation.isPending ? 'Logging in...' : 'Login'}
                        </button>
                        {loginMutation.isError && (
                            <div className="text-red-600 text-sm">
                                {(loginMutation.error as Error)?.message || 'Login gagal'}
                            </div>
                        )}
                        {loginMutation.isSuccess && (
                            <div className="text-green-600 text-sm">Login berhasil!</div>
                        )}
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-md">
                            <p className="font-semibold">Selamat datang, {user?.name}!</p>
                            <p className="text-sm text-gray-600">NIK: {user?.nik}</p>
                            <p className="text-sm text-gray-600">Role: {user?.role}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>

            {/* Production Data Section */}
            {isAuthenticated && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-semibold mb-4">Production Data</h2>

                    {/* Filter by Line */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Filter by Line</label>
                        <select
                            value={selectedLine || ''}
                            onChange={(e) => setSelectedLine(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full px-4 py-2 border rounded-md"
                        >
                            <option value="">All Lines</option>
                            <option value="1">Line 1</option>
                            <option value="2">Line 2</option>
                            <option value="3">Line 3</option>
                        </select>
                    </div>

                    {/* Production Data Display */}
                    {productionDataQuery.isLoading && (
                        <div className="text-center py-4">Loading...</div>
                    )}
                    {productionDataQuery.isError && (
                        <div className="text-red-600 py-4">
                            Error: {(productionDataQuery.error as Error)?.message}
                        </div>
                    )}
                    {productionDataQuery.isSuccess && productionDataQuery.data && (
                        <div className="space-y-4">
                            {selectedLine ? (
                                // Data by line
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600">Good</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {productionDataQuery.data.good || 0}
                                        </p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600">Reject</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {productionDataQuery.data.reject || 0}
                                        </p>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600">Rework</p>
                                        <p className="text-2xl font-bold text-yellow-600">
                                            {productionDataQuery.data.rework || 0}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600">Total</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {productionDataQuery.data.total || 0}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                // Overall data
                                <div>
                                    <h3 className="font-semibold mb-2">Overall Statistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-600">Good</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {productionDataQuery.data.overall?.good || 0}
                                            </p>
                                        </div>
                                        <div className="bg-red-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-600">Reject</p>
                                            <p className="text-2xl font-bold text-red-600">
                                                {productionDataQuery.data.overall?.reject || 0}
                                            </p>
                                        </div>
                                        <div className="bg-yellow-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-600">Rework</p>
                                            <p className="text-2xl font-bold text-yellow-600">
                                                {productionDataQuery.data.overall?.rework || 0}
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-600">Total</p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {productionDataQuery.data.overall?.total || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* By Line Data */}
                                    <div className="mt-6">
                                        <h3 className="font-semibold mb-2">By Line</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {Object.entries(productionDataQuery.data.byLine || {}).map(([lineId, data]) => (
                                                <div key={lineId} className="border p-4 rounded-lg">
                                                    <h4 className="font-semibold mb-2">{lineId.toUpperCase()}</h4>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Good:</span>
                                                            <span className="ml-2 font-bold text-green-600">{data.good}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Reject:</span>
                                                            <span className="ml-2 font-bold text-red-600">{data.reject}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Rework:</span>
                                                            <span className="ml-2 font-bold text-yellow-600">{data.rework}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">Total:</span>
                                                            <span className="ml-2 font-bold">{data.total}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Test Credentials */}
            <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="font-semibold mb-2">Test Credentials:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>NIK: 1234567890, Password: password123</li>
                    <li>NIK: 0987654321, Password: admin123</li>
                    <li>NIK: 1111111111, Password: user123</li>
                </ul>
            </div>
        </div>
    );
}

