import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import ChartCard from './ChartCard';
import { COLORS } from './constants';

interface OverviewChartProps {
    pieData: Array<{ name: string; value: number; display: string; color: string }>;
    outputLine: number;
}

// Custom Tooltip untuk pie chart
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        // Ambil total dari payload (data.payload.total sudah di-set di pieDataWithTotal)
        // Jika tidak ada, hitung total dari semua payload sebagai fallback
        const total = data.payload?.total || data.payload?.payload?.total || (payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0));
        const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';

        return (
            <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                    <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: data.payload.color }}
                    />
                    <p className="font-semibold text-gray-800 text-sm" style={{ textTransform: 'capitalize' }}>
                        {data.name}
                    </p>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Nilai:</span>
                        <span className="font-bold text-gray-900 text-sm">{data.value.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Persentase:</span>
                        <span className="font-semibold text-blue-600 text-sm">{percentage}%</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-200 pt-1 mt-1">
                        <span className="text-xs text-gray-600">Total:</span>
                        <span className="font-semibold text-gray-800 text-sm">{total.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const OverviewChart = memo(({ pieData, outputLine }: OverviewChartProps) => {
    const totalCount = useMemo(() => {
        // Selalu gunakan outputLine sebagai total jika ada, karena outputLine adalah total output yang sebenarnya
        // Jangan gunakan jumlah dari pieData karena pieData mungkin tidak lengkap atau sudah difilter
        if (outputLine && outputLine > 0) {
            return outputLine;
        }
        // Fallback: jika outputLine tidak ada, gunakan jumlah dari pieData
        return pieData.reduce((sum, item) => sum + item.value, 0);
    }, [outputLine, pieData]);

    // Tambahkan total ke setiap data untuk tooltip
    const pieDataWithTotal = useMemo(() => {
        return pieData.map(item => ({
            ...item,
            total: totalCount
        }));
    }, [pieData, totalCount]);

    // State untuk track active slice saat hover
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

    // State untuk track dot yang aktif (hover atau click)
    const [activeDot, setActiveDot] = useState<string | null>(null);
    const [clickedDot, setClickedDot] = useState<string | null>(null);

    // Mapping warna ke nama kategori dan color key
    const colorMapping = useMemo(() => {
        const mapping: Array<{ colorKey: string; color: string; name: string; data: any }> = [];
        pieDataWithTotal.forEach((item) => {
            // Good - Hijau (soft)
            if (item.color === '#00e676' || item.color === COLORS.green || item.color === COLORS.greenSoft || item.name.toLowerCase() === 'good') {
                mapping.push({ colorKey: 'green', color: item.color, name: item.name, data: item });
            }
            // WIRA - Orange (soft)
            else if (item.color === '#ff9100' || item.color === COLORS.orange || item.color === COLORS.orangeSoft || item.name.toLowerCase() === 'wira') {
                mapping.push({ colorKey: 'orange', color: item.color, name: item.name, data: item });
            }
            // Reject - Merah (soft)
            else if (item.color === '#ff1744' || item.color === COLORS.red || item.color === COLORS.redSoft || item.name.toLowerCase() === 'reject') {
                mapping.push({ colorKey: 'red', color: item.color, name: item.name, data: item });
            }
            // Sisa Output - Abu ke biruan
            else if (item.color === '#2979ff' || item.color === COLORS.blue || item.color === COLORS.blueGray || item.name.toLowerCase().includes('sisa')) {
                mapping.push({ colorKey: 'blue', color: COLORS.blueGray, name: item.name, data: item });
            }
        });
        return mapping;
    }, [pieDataWithTotal]);

    // Cari data berdasarkan color key
    const getDataByColor = (colorKey: string) => {
        const mapping = colorMapping.find(m => m.colorKey === colorKey);
        return mapping ? mapping.data : null;
    };

    // Debug: Log pieData yang diterima
    useEffect(() => {
        console.log('📊 [OverviewChart] Received pieData:', pieData);
    }, [pieData]);

    const cardRef = useRef<HTMLDivElement>(null);
    const [showChart, setShowChart] = useState(true);
    const [cardWidth, setCardWidth] = useState(0);

    useEffect(() => {
        const checkWidth = () => {
            if (cardRef.current) {
                const width = cardRef.current.offsetWidth;
                setCardWidth(width);
                // Hide chart hanya jika width card sangat kecil (kurang dari 100px)
                // Di tablet kecil biasanya masih lebih dari 100px, jadi chart tetap tampil
                setShowChart(width >= 100);
            }
        };

        checkWidth();
        window.addEventListener('resize', checkWidth);

        // Use ResizeObserver untuk detect perubahan width card
        const resizeObserver = new ResizeObserver(checkWidth);
        if (cardRef.current) {
            resizeObserver.observe(cardRef.current);
        }

        return () => {
            window.removeEventListener('resize', checkWidth);
            resizeObserver.disconnect();
        };
    }, []);

    // Hitung ukuran chart berdasarkan width card untuk responsivitas
    const chartConfig = useMemo(() => {
        if (cardWidth === 0) {
            return {
                outerRadius: '90%',
                strokeWidth: 2,
                minHeight: '100px'
            };
        }

        // Untuk card kecil (100-200px), kurangi outerRadius dan strokeWidth
        if (cardWidth < 200) {
            return {
                outerRadius: '85%',
                strokeWidth: 1.5,
                minHeight: '80px'
            };
        }
        // Untuk card sedang (200-300px)
        else if (cardWidth < 300) {
            return {
                outerRadius: '88%',
                strokeWidth: 2,
                minHeight: '100px'
            };
        }
        // Untuk card besar (>300px)
        else {
            return {
                outerRadius: '90%',
                strokeWidth: 2,
                minHeight: '100px'
            };
        }
    }, [cardWidth]);

    return (
        <ChartCard
            ref={cardRef}
            title="Distribusi Data"
            icon={PieIcon}
            className="h-full w-full"
        >
            <div className="flex flex-col items-center justify-center h-full relative overflow-visible" style={{ padding: 'clamp(0.25rem, 0.5vw, 0.5rem)' }}>
                {showChart ? (
                    <>
                        <div className="w-full h-full relative flex-1 min-h-0" style={{ minHeight: chartConfig.minHeight }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart key={`pie-${pieData.map(d => `${d.name}-${d.value}`).join('-')}`}>
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'transparent' }}
                                        animationDuration={200}
                                    />
                                    <Pie
                                        data={pieDataWithTotal}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={0}
                                        outerRadius={chartConfig.outerRadius as string}
                                        dataKey="value"
                                        stroke="white"
                                        strokeWidth={chartConfig.strokeWidth}
                                        className="xs:stroke-[1.5px] sm:stroke-[2px] md:stroke-[2.5px]"
                                        animationBegin={0}
                                        animationDuration={400}
                                        animationEasing="ease-out"
                                        onMouseEnter={(_, index) => {
                                            setActiveIndex(index);
                                        }}
                                        onMouseLeave={() => {
                                            if (!clickedDot) {
                                                setActiveIndex(undefined);
                                            }
                                        }}
                                    >
                                        {pieDataWithTotal.map((entry, index) => {
                                            const isActive = activeIndex === index || (clickedDot && colorMapping.find(m => m.colorKey === clickedDot)?.name === entry.name);
                                            return (
                                                <Cell
                                                    key={`cell-${entry.name}-${entry.value}-${index}`}
                                                    fill={entry.color}
                                                    style={{
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        opacity: isActive ? 0.9 : 1,
                                                        filter: isActive ? 'brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : 'none',
                                                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                                    }}
                                                />
                                            );
                                        })}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Legend Dots - Titik warna di sekitar pie chart */}
                        <div className="absolute inset-0 pointer-events-none overflow-visible">
                            {/* Green Dot - Top Left (Good) */}
                            {getDataByColor('green') && (
                                <div
                                    className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
                                    style={{
                                        top: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        left: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                    onMouseEnter={() => {
                                        const data = getDataByColor('green');
                                        if (data) {
                                            setActiveDot('green');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(index);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setActiveDot(null);
                                        if (!clickedDot) {
                                            setActiveIndex(undefined);
                                        }
                                    }}
                                    onClick={() => {
                                        const data = getDataByColor('green');
                                        if (data) {
                                            setClickedDot(clickedDot === 'green' ? null : 'green');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(clickedDot === 'green' ? undefined : index);
                                        }
                                    }}
                                >
                                    <div
                                        className="rounded-full transition-all duration-300 hover:scale-125"
                                        style={{
                                            width: 'clamp(8px, 1.2vw, 14px)',
                                            height: 'clamp(8px, 1.2vw, 14px)',
                                            backgroundColor: COLORS.greenSoft,
                                            border: '2px solid #0284C7',
                                            boxShadow: activeDot === 'green' || clickedDot === 'green'
                                                ? '0 0 12px rgba(0, 230, 118, 0.6), 0 0 24px rgba(0, 230, 118, 0.4)'
                                                : '0 1px 4px rgba(0, 0, 0, 0.2)',
                                            transform: activeDot === 'green' || clickedDot === 'green' ? 'scale(1.3)' : 'scale(1)',
                                        }}
                                    />
                                    {/* Info Tooltip */}
                                    {(activeDot === 'green' || clickedDot === 'green') && getDataByColor('green') && (
                                        <div
                                            className="absolute top-full left-full ml-2 mt-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[120px] z-[100] pointer-events-none"
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.greenSoft }} />
                                                <p className="font-semibold text-gray-800 text-xs">Good</p>
                                            </div>
                                            <p className="text-xs text-gray-600">Nilai: <span className="font-bold text-gray-900">{getDataByColor('green')?.value.toLocaleString()}</span></p>
                                            <p className="text-xs text-gray-600">Persentase: <span className="font-semibold text-blue-600">{totalCount > 0 ? ((getDataByColor('green')?.value || 0) / totalCount * 100).toFixed(1) : '0'}%</span></p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Orange Dot - Top Right (WIRA) */}
                            {getDataByColor('orange') && (
                                <div
                                    className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
                                    style={{
                                        top: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        right: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        transform: 'translate(50%, -50%)',
                                    }}
                                    onMouseEnter={() => {
                                        const data = getDataByColor('orange');
                                        if (data) {
                                            setActiveDot('orange');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(index);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setActiveDot(null);
                                        if (!clickedDot) {
                                            setActiveIndex(undefined);
                                        }
                                    }}
                                    onClick={() => {
                                        const data = getDataByColor('orange');
                                        if (data) {
                                            setClickedDot(clickedDot === 'orange' ? null : 'orange');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(clickedDot === 'orange' ? undefined : index);
                                        }
                                    }}
                                >
                                    <div
                                        className="rounded-full transition-all duration-300 hover:scale-125"
                                        style={{
                                            width: 'clamp(8px, 1.2vw, 14px)',
                                            height: 'clamp(8px, 1.2vw, 14px)',
                                            backgroundColor: COLORS.orangeSoft,
                                            border: '2px solid #0284C7',
                                            boxShadow: activeDot === 'orange' || clickedDot === 'orange'
                                                ? '0 0 12px rgba(255, 145, 0, 0.6), 0 0 24px rgba(255, 145, 0, 0.4)'
                                                : '0 1px 4px rgba(0, 0, 0, 0.2)',
                                            transform: activeDot === 'orange' || clickedDot === 'orange' ? 'scale(1.3)' : 'scale(1)',
                                        }}
                                    />
                                    {/* Info Tooltip */}
                                    {(activeDot === 'orange' || clickedDot === 'orange') && getDataByColor('orange') && (
                                        <div
                                            className="absolute top-full right-0 transform -translate-x-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[120px] z-10 pointer-events-none"
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.orangeSoft }} />
                                                <p className="font-semibold text-gray-800 text-xs">WIRA</p>
                                            </div>
                                            <p className="text-xs text-gray-600">Nilai: <span className="font-bold text-gray-900">{getDataByColor('orange')?.value.toLocaleString()}</span></p>
                                            <p className="text-xs text-gray-600">Persentase: <span className="font-semibold text-blue-600">{totalCount > 0 ? ((getDataByColor('orange')?.value || 0) / totalCount * 100).toFixed(1) : '0'}%</span></p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Red Dot - Bottom Left (Reject) */}
                            {getDataByColor('red') && (
                                <div
                                    className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
                                    style={{
                                        bottom: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        left: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        transform: 'translate(-50%, 50%)',
                                    }}
                                    onMouseEnter={() => {
                                        const data = getDataByColor('red');
                                        if (data) {
                                            setActiveDot('red');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(index);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setActiveDot(null);
                                        if (!clickedDot) {
                                            setActiveIndex(undefined);
                                        }
                                    }}
                                    onClick={() => {
                                        const data = getDataByColor('red');
                                        if (data) {
                                            setClickedDot(clickedDot === 'red' ? null : 'red');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(clickedDot === 'red' ? undefined : index);
                                        }
                                    }}
                                >
                                    <div
                                        className="rounded-full transition-all duration-300 hover:scale-125"
                                        style={{
                                            width: 'clamp(8px, 1.2vw, 14px)',
                                            height: 'clamp(8px, 1.2vw, 14px)',
                                            backgroundColor: COLORS.redSoft,
                                            border: '2px solid #0284C7',
                                            boxShadow: activeDot === 'red' || clickedDot === 'red'
                                                ? '0 0 12px rgba(255, 23, 68, 0.6), 0 0 24px rgba(255, 23, 68, 0.4)'
                                                : '0 1px 4px rgba(0, 0, 0, 0.2)',
                                            transform: activeDot === 'red' || clickedDot === 'red' ? 'scale(1.3)' : 'scale(1)',
                                        }}
                                    />
                                    {/* Info Tooltip */}
                                    {(activeDot === 'red' || clickedDot === 'red') && getDataByColor('red') && (
                                        <div
                                            className="absolute bottom-full left-full ml-2 mb-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[120px] z-[100] pointer-events-none"
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.redSoft }} />
                                                <p className="font-semibold text-gray-800 text-xs">Reject</p>
                                            </div>
                                            <p className="text-xs text-gray-600">Nilai: <span className="font-bold text-gray-900">{getDataByColor('red')?.value.toLocaleString()}</span></p>
                                            <p className="text-xs text-gray-600">Persentase: <span className="font-semibold text-blue-600">{totalCount > 0 ? ((getDataByColor('red')?.value || 0) / totalCount * 100).toFixed(1) : '0'}%</span></p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Blue Dot - Bottom Right (Sisa Output) */}
                            {getDataByColor('blue') && (
                                <div
                                    className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
                                    style={{
                                        bottom: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        right: 'clamp(0.5rem, 1.5vw, 1rem)',
                                        transform: 'translate(50%, 50%)',
                                    }}
                                    onMouseEnter={() => {
                                        const data = getDataByColor('blue');
                                        if (data) {
                                            setActiveDot('blue');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(index);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setActiveDot(null);
                                        if (!clickedDot) {
                                            setActiveIndex(undefined);
                                        }
                                    }}
                                    onClick={() => {
                                        const data = getDataByColor('blue');
                                        if (data) {
                                            setClickedDot(clickedDot === 'blue' ? null : 'blue');
                                            const index = pieDataWithTotal.findIndex(item => item.name === data.name);
                                            setActiveIndex(clickedDot === 'blue' ? undefined : index);
                                        }
                                    }}
                                >
                                    <div
                                        className="rounded-full transition-all duration-300 hover:scale-125"
                                        style={{
                                            width: 'clamp(8px, 1.2vw, 14px)',
                                            height: 'clamp(8px, 1.2vw, 14px)',
                                            backgroundColor: COLORS.blueGray,
                                            border: '2px solid #0284C7',
                                            boxShadow: activeDot === 'blue' || clickedDot === 'blue'
                                                ? '0 0 12px rgba(144, 164, 174, 0.6), 0 0 24px rgba(144, 164, 174, 0.4)'
                                                : '0 1px 4px rgba(0, 0, 0, 0.2)',
                                            transform: activeDot === 'blue' || clickedDot === 'blue' ? 'scale(1.3)' : 'scale(1)',
                                        }}
                                    />
                                    {/* Info Tooltip */}
                                    {(activeDot === 'blue' || clickedDot === 'blue') && getDataByColor('blue') && (
                                        <div
                                            className="absolute bottom-full right-full mr-2 mb-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[120px] z-[100] pointer-events-none"
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS.blueGray }} />
                                                <p className="font-semibold text-gray-800 text-xs">{getDataByColor('blue')?.name}</p>
                                            </div>
                                            <p className="text-xs text-gray-600">Nilai: <span className="font-bold text-gray-900">{getDataByColor('blue')?.value.toLocaleString()}</span></p>
                                            <p className="text-xs text-gray-600">Persentase: <span className="font-semibold text-blue-600">{totalCount > 0 ? ((getDataByColor('blue')?.value || 0) / totalCount * 100).toFixed(1) : '0'}%</span></p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xs px-2 text-center">
                        Chart tidak tersedia
                    </div>
                )}
            </div>
        </ChartCard>
    );
});

OverviewChart.displayName = 'OverviewChart';

export default OverviewChart;

