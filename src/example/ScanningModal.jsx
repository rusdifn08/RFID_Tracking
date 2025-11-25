/**
 * Scanning Modal Component
 * Menampilkan animasi scanning RFID dan capture RFID ID
 * Mode Batch: Scan beberapa RFID sekaligus sebelum save
 * 
 * AUTO RFID READER:
 * - RFID reader mengetik ID otomatis
 * - Auto-enter setelah ID lengkap
 * - System capture keyboard input secara realtime
 */

import { useState, useEffect, useRef } from 'react';
import './ScanningModal.css';

const ScanningModal = ({ onClose, onScanComplete, onSaveAll, workOrderData, scannedRfids, isSubmitting }) => {
    const [rfidBuffer, setRfidBuffer] = useState('');
    const [lastScanTime, setLastScanTime] = useState(0);
    const bufferTimeoutRef = useRef(null);

    // Auto-detect RFID input dari keyboard (RFID reader mengetik otomatis)
    // HANYA AKTIF DI MODAL INI, TIDAK GANGGU INPUT FORM LAIN
    useEffect(() => {
        const handleKeyPress = (event) => {
            // SKIP jika user sedang mengetik di input/textarea/select
            const activeElement = document.activeElement;
            const isTypingInInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                activeElement.isContentEditable
            );

            // Jika sedang ketik di form, JANGAN tangkap input RFID
            if (isTypingInInput) {
                return;
            }

            const currentTime = Date.now();

            // Enter key = RFID selesai diketik, process sekarang
            if (event.key === 'Enter') {
                event.preventDefault();

                if (rfidBuffer.trim().length > 0) {
                    // Add RFID ke list
                    onScanComplete(rfidBuffer.trim());

                    // Reset buffer
                    setRfidBuffer('');
                    setLastScanTime(currentTime);
                }
                return;
            }

            // Ignore special keys
            if (event.key.length > 1 && event.key !== 'Backspace') {
                return;
            }

            // Backspace handling
            if (event.key === 'Backspace') {
                setRfidBuffer(prev => prev.slice(0, -1));
                return;
            }

            // Tambah karakter ke buffer
            setRfidBuffer(prev => prev + event.key);

            // Auto-clear buffer setelah 100ms tidak ada input (reset jika terlalu lama)
            if (bufferTimeoutRef.current) {
                clearTimeout(bufferTimeoutRef.current);
            }

            bufferTimeoutRef.current = setTimeout(() => {
                setRfidBuffer('');
            }, 100);
        };

        // Add event listener

        window.addEventListener('keydown', handleKeyPress);

        // Cleanup
        return () => {

            window.removeEventListener('keydown', handleKeyPress);
            if (bufferTimeoutRef.current) {
                clearTimeout(bufferTimeoutRef.current);
            }
        };
    }, [rfidBuffer, onScanComplete]);

    // Demo scan simulation (untuk testing tanpa RFID reader fisik)
    const handleScanSimulation = () => {
        const generatedRfid = generateRFIDId();
        onScanComplete(generatedRfid);
    };

    // Generate random RFID ID untuk demo
    const generateRFIDId = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `RF${year}${month}${day}${random}`;
    };

    return (
        <div className="scanning-modal-overlay">
            <div className="scanning-modal-content batch-mode" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📡 Batch Scanning Mode</h2>
                    <p className="subtitle">Scan beberapa RFID sekaligus</p>
                </div>

                {/* Work Order Info */}
                <div className="work-order-info compact">
                    <div className="info-item">
                        <span className="info-label">WO:</span>
                        <span className="info-value">{workOrderData.workOrder}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Style:</span>
                        <span className="info-value">{workOrderData.style}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Buyer:</span>
                        <span className="info-value">{workOrderData.buyer}</span>
                    </div>
                </div>

                {/* Scan Area - Always Scanning Animation */}
                <div className="scan-area">
                    <div className="scanning-active">
                        {/* RFID Card Animation - ALWAYS RUNNING */}
                        <div className="rfid-card-animation">
                            <div className="rfid-card">
                                <div className="card-chip"></div>
                                <div className="card-waves">
                                    <div className="wave"></div>
                                    <div className="wave"></div>
                                    <div className="wave"></div>
                                </div>
                                <div className="card-text">
                                    <div className="card-logo">RFID</div>
                                    <div className="card-number">●●●● ●●●● ●●●●</div>
                                </div>
                            </div>
                            <div className="scan-beam"></div>
                        </div>

                        {/* Status Text & Buffer Display */}
                        {rfidBuffer.length > 0 ? (
                            <div className="rfid-buffer-display">
                                <p className="buffer-label">📝 Sedang membaca...</p>
                                <p className="buffer-value">{rfidBuffer}</p>
                            </div>
                        ) : (
                            <p className="scanning-text">🔍 Siap Scan - Dekatkan kartu RFID</p>
                        )}
                    </div>
                </div>

                {/* Scanned List */}
                <div className="scanned-list-container">
                    <div className="list-header">
                        <h3>📋 RFID yang Sudah di-Scan</h3>
                        <span className="count-badge">{scannedRfids.length}</span>
                    </div>

                    {scannedRfids.length === 0 ? (
                        <div className="empty-list">
                            <p>Belum ada RFID yang di-scan</p>
                        </div>
                    ) : (
                        <div className="scanned-list">
                            {scannedRfids.map((rfid, index) => (
                                <div key={index} className={`scanned-item ${rfid.status === 'hasper' ? 'duplicate-item' : ''}`}>
                                    <span className="item-number">{index + 1}</span>
                                    <span className="item-rfid">{rfid.id}</span>
                                    <span className="item-time">
                                        {new Date(rfid.scanTime).toLocaleTimeString('id-ID')}
                                    </span>
                                    {rfid.status === 'hasper' && (
                                        <span className="duplicate-badge">
                                            🔄 Duplikasi - Status: Hasper
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="modal-actions">
                    <button
                        className="cancel-btn"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        ❌ Batal
                    </button>
                    <button
                        className="save-all-btn"
                        onClick={onSaveAll}
                        disabled={scannedRfids.length === 0 || isSubmitting}
                    >
                        {isSubmitting ? '⏳ Menyimpan...' : `💾 Simpan Semua (${scannedRfids.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanningModal;
