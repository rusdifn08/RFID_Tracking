import React from 'react';
import { useLocation } from 'react-router-dom';

interface DynamicEmbedProps {
  baseUrl: string;
  prefix: string; 
}

const DynamicEmbed: React.FC<DynamicEmbedProps> = ({ baseUrl, prefix }) => {
  const location = useLocation();

  // Menghapus prefix dari URL web Anda untuk mendapatkan path asli web tujuan
  const iframePath = location.pathname.replace(prefix, "");
  
  // Hapus parameter internal seperti 'type' jika ada
  const searchParams = new URLSearchParams(location.search);
  searchParams.delete('type');
  const searchQuery = searchParams.toString() ? `?${searchParams.toString()}` : '';

  // Menggabungkan IP tujuan, path halaman, beserta query string
  const targetUrl = `${baseUrl}${iframePath}${searchQuery}`;

  return (
    <div className="w-full h-full overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/80">
      <iframe
        src={targetUrl}
        title="External App"
        className="w-full h-full border-none"
      />
    </div>
  );
};

export default DynamicEmbed;
