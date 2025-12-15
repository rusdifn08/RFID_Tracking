import { memo } from 'react';
import { Radio } from 'lucide-react';

const PageHeader = memo(() => {
    return (
        <div className="text-center mb-4 xs:mb-5 sm:mb-6 md:mb-8">
            <div className="flex items-center justify-center gap-3 xs:gap-3.5 sm:gap-4 mb-3 xs:mb-3.5 sm:mb-4">
                <div className="p-2 xs:p-2.5 sm:p-3 bg-white border-2 border-blue-500 rounded-lg xs:rounded-xl">
                    <Radio className="w-6 xs:w-7 sm:w-8 md:w-9 lg:w-10 h-6 xs:h-7 sm:h-8 md:h-9 lg:h-10 text-blue-500" strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-2xl xs:text-2xl sm:text-3xl md:text-3xl lg:text-3xl font-bold text-gray-800 uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                        Checking RFID
                    </h1>
                    <p className="text-sm xs:text-sm sm:text-base md:text-base lg:text-base text-gray-600 font-medium mt-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>
                        Real-time RFID Tracking & Verification System
                    </p>
                </div>
            </div>
        </div>
    );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;

