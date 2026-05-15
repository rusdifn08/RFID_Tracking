import QcScanStationHost from './QcScanStationHost';

interface QcRepairScanModalHostProps {
    isOpen: boolean;
    onClose: () => void;
}

/** Modal scan QC Repair untuk Dashboard Quality Control Cutting. */
export default function QcRepairScanModalHost({ isOpen, onClose }: QcRepairScanModalHostProps) {
    return (
        <QcScanStationHost
            isOpen={isOpen}
            onClose={onClose}
            accent="amber"
            lockMode="repair"
            defaultMode="repair"
            lastScanTitle="Scan terakhir"
            ringkasanLabel="Ringkasan sesi"
        />
    );
}
