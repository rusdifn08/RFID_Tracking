import React, { useState, useMemo } from 'react';

import { Filter, ChevronDown, ChevronUp, X, Download } from 'lucide-react';
const getTodayIso = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface PrendiReportRow {
  line: string;
  working_order: string;
  total: number;
  // Detail data populated on expand
  details?: PrendiReportDetail[];
  isExpanded?: boolean;
  isLoadingDetail?: boolean;
}

interface PrendiReportDetail {
  tahap: string;
  qty: number;
  [key: string]: any;
}

export default function PrendiReportTab() {
  const [dateFrom, setDateFrom] = useState(getTodayIso());
  const [dateTo, setDateTo] = useState(getTodayIso());
  const [line, setLine] = useState('8');
  const [status, setStatus] = useState('IN_FOLDING');
  
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<PrendiReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState({
    dateFrom: '',
    dateTo: '',
    line: '',
    status: ''
  });

  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    wo: string;
    line: string;
    isLoading: boolean;
    data: any | null;
  }>({
    isOpen: false,
    wo: '',
    line: '',
    isLoading: false,
    data: null
  });

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        tanggalfrom: dateFrom,
        tanggalto: dateTo,
        last_status: status,
        line: line
      });
      const response = await fetch(`/api/prendi/report-line?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();
      
      // Expected array of objects based on screenshot
      const resultData = responseData?.data || responseData || [];
      const mappedData = Array.isArray(resultData) ? resultData.map((item: any) => ({
        line: item.line || item.LINE || `Line ${line}`,
        working_order: item.working_order || item.WORKING_ORDER || item.wo || '-',
        total: Number(item.total || item.TOTAL || item.qty || 0),
        isExpanded: false
      })) : [];
      
      setData(mappedData);
      setSummary({
        dateFrom,
        dateTo,
        line: `Line ${line}`,
        status
      });
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data laporan dari server.');
      // Fallback for visual testing if api is down during development:
      // setData([
      //   { line: `Line ${line}`, working_order: '186774', total: 26 },
      //   { line: `Line ${line}`, working_order: '186776', total: 4 },
      //   { line: `Line ${line}`, working_order: '187266', total: 59 },
      //   { line: `Line ${line}`, working_order: '187404', total: 1 }
      // ]);
      setSummary({ dateFrom, dateTo, line: `Line ${line}`, status });
    } finally {
      setIsLoading(false);
    }
  };

  const openDetailModal = async (wo: string, rowLine: string) => {
    setModalData({ isOpen: true, wo, line: rowLine, isLoading: true, data: null });
    try {
      const params = new URLSearchParams({
        tanggalfrom: dateFrom,
        tanggalto: dateTo,
        line: line,
        wo: wo
      });
      const response = await fetch(`/api/prendi/report-line/detail?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch details');
      const responseData = await response.json();
      const resultDetail = responseData?.data || null;
      setModalData({ isOpen: true, wo, line: rowLine, isLoading: false, data: resultDetail });
    } catch (err) {
      setModalData({ isOpen: true, wo, line: rowLine, isLoading: false, data: null });
    }
  };

  const totalQty = useMemo(() => data.reduce((acc, row) => acc + (row.total || 0), 0), [data]);
  const totalWo = data.length;

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header section matching UI */}
      <div>
        <h2 className="text-sm font-bold text-teal-600 tracking-wider uppercase mb-1">RFID GARMENT TRACKING</h2>
        <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            Laporan <span className="text-teal-500">Line</span> & <span className="text-orange-500">WO</span>
            </h1>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-teal-200 text-teal-700 rounded-full font-semibold shadow-sm hover:bg-teal-50">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                Siap
            </button>
        </div>
        <p className="text-slate-500 text-sm mt-2 font-medium">Klik baris untuk lihat detail tahap produksi & unduh Excel</p>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold">
          <Filter className="w-5 h-5 text-teal-500" />
          Filter Laporan
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DARI TANGGAL</label>
            <div className="relative">
                <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500"
                />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SAMPAI TANGGAL</label>
            <div className="relative">
                <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500"
                />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LINE</label>
            <select 
                value={line}
                onChange={(e) => setLine(e.target.value)}
                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500"
            >
              {Array.from({ length: 21 }, (_, i) => i + 1).map(n => (
                <option key={n} value={String(n)}>Line {n}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">STATUS</label>
            <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500"
            >
              <option value="IN_CUTTING">IN_CUTTING</option>
              <option value="OUTPUT_SEWING">OUTPUT_SEWING</option>
              <option value="IN_FOLDING">IN_FOLDING</option>
              <option value="OUT_FOLDING">OUT_FOLDING</option>
              <option value="IN_DRYROOM">IN_DRYROOM</option>
              <option value="OUT_DRYROOM">OUT_DRYROOM</option>
              <option value="GOOD">GOOD</option>
              <option value="PQC_GOOD">PQC_GOOD</option>
            </select>
          </div>

          <button 
            onClick={fetchReport}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/30 transition-all active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:active:scale-100 h-[42px] whitespace-nowrap"
          >
            {isLoading ? 'Loading...' : 'Tampilkan Laporan'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-2">TOTAL WO</p>
            <p className="text-4xl font-extrabold text-slate-800">{totalWo}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">TOTAL QTY</p>
            <p className="text-4xl font-extrabold text-slate-800">{totalQty}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">PERIODE</p>
            <p className="text-sm font-bold text-slate-700 mb-1">
                {summary.dateFrom ? `${summary.dateFrom} → ${summary.dateTo}` : '-'}
            </p>
            <p className="text-xs text-slate-500">
                {summary.line ? `${summary.line} • ${summary.status?.replace('_', ' ')}` : 'Belum difilter'}
            </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-3 flex items-center justify-between">
             <div className="flex gap-2 items-center text-white/90 text-xs font-medium">
                <span>💡</span>
                <span>Klik baris untuk detail tahap produksi</span>
             </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-cyan-600 text-white text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">LINE</th>
                        <th className="px-6 py-4">WORKING ORDER</th>
                        <th className="px-6 py-4 text-right">TOTAL</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                {error ? (
                                    <div className="text-red-500 font-medium">{error}</div>
                                ) : (
                                    'Tidak ada data. Silakan atur filter dan klik "Tampilkan Laporan".'
                                )}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <React.Fragment key={idx}>
                                <tr 
                                    onClick={() => openDetailModal(row.working_order, row.line)}
                                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-slate-400">
                                        {idx + 1}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-50 text-cyan-700">
                                            {row.line}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                                        {row.working_order}
                                    </td>
                                    <td className="px-6 py-4 text-right text-base font-extrabold text-orange-500">
                                        {row.total}
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))
                    )}
                </tbody>
                {data.length > 0 && (
                    <tfoot>
                        <tr className="bg-slate-50">
                            <td colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-slate-700">
                                Grand Total
                            </td>
                            <td className="px-6 py-4 text-right text-xl font-extrabold text-teal-600">
                                {totalQty}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
      </div>

      {/* Modal Detail WO */}
      {modalData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-5 text-white relative">
              <button 
                onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-100 mb-1">DETAIL WO</h3>
              <h2 className="text-2xl font-extrabold shadow-sm mb-1">WO {modalData.wo}</h2>
              <p className="text-sm text-blue-50">{modalData.line} • {dateFrom} s/d {dateTo}</p>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              {modalData.isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                  <p className="text-sm font-semibold text-slate-500">Memuat detail...</p>
                </div>
              ) : modalData.data ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Output Sewing', key: 'output_sewing', color: 'bg-blue-100 text-blue-700' },
                    { label: 'QC (Good)', key: 'good', color: 'bg-indigo-100 text-indigo-700' },
                    { label: 'IN Dryroom', key: 'in_dryroom', color: 'bg-cyan-100 text-cyan-700' },
                    { label: 'OUT Dryroom', key: 'out_dryroom', color: 'bg-teal-100 text-teal-700' },
                    { label: 'IN Folding', key: 'in_folding', color: 'bg-blue-50 text-blue-600' },
                    { label: 'OUT Folding', key: 'out_folding', color: 'bg-sky-100 text-sky-700' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${item.color}`}>
                        {item.label}
                      </span>
                      <span className="text-lg font-extrabold text-slate-800">
                        {modalData.data[item.key] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 font-medium">
                  Data detail tidak tersedia
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setModalData(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Tutup
              </button>
              <button 
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/30 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
