// NOTE:
// Untuk DEV kita pakai Vite proxy (lihat `vite.config.ts`) supaya tidak kena CORS.
// Jadi fetch cukup ke path relatif: `/line`, `/qc-pqc`, dst.
// Untuk PROD, path relatif juga tetap aman jika nanti diproxy oleh server.js / reverse proxy.
const BASE_URL = '';

export interface TrackingTimeParams {
 tanggalfrom: string;
 tanggalto: string;
 id_garment?: string;
}

const fetchWithParams = async (endpoint: string, params: TrackingTimeParams) => {
 // BASE_URL sengaja kosong -> pakai relative URL (akan diproxy oleh Vite saat DEV)
 const url = new URL(`${BASE_URL}${endpoint}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

 url.searchParams.append('tanggalfrom', params.tanggalfrom);
 url.searchParams.append('tanggalto', params.tanggalto);
 if (params.id_garment) {
  url.searchParams.append('id_garment', params.id_garment);
 }

 const fullUrl = url.toString();
 console.log(`🔵 [Tracking Service] Fetching: ${fullUrl}`);

 try {
  console.log(`🔵 [Tracking Service] Starting fetch to: ${fullUrl}`);
  const response = await fetch(fullUrl);

  console.log(`🔵 [Tracking Service] Response status: ${response.status} ${response.statusText}`);
  console.log(`🔵 [Tracking Service] Response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
   const errorText = await response.text().catch(() => 'No error details');
   console.error(`❌ [Tracking Service] HTTP error ${response.status} for ${endpoint}:`, errorText);
   console.error(`❌ [Tracking Service] Full URL was: ${fullUrl}`);
   throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  console.log(`🔵 [Tracking Service] Response content-type: ${contentType}`);

  let data;
  if (contentType && contentType.includes('application/json')) {
   data = await response.json();
  } else {
   const textData = await response.text();
   console.warn(`⚠️ [Tracking Service] Response is not JSON, got text:`, textData.substring(0, 200));
   try {
    data = JSON.parse(textData);
   } catch (parseError) {
    throw new Error(`Invalid JSON response: ${textData.substring(0, 200)}`);
   }
  }

  console.log(`✅ [Tracking Service] Success for ${endpoint}:`, {
   hasData: !!data.data,
   dataLength: Array.isArray(data.data) ? data.data.length : data.data ? 1 : 0,
   status: data.status,
   count: data.count,
   meta: data.meta,
   responseKeys: Object.keys(data || {}),
   fullResponse: data
  });

  return data;
 } catch (error) {
  // Failed to fetch => biasanya proxy tidak jalan / jaringan putus.
  console.error(`❌ [Tracking Service] Error fetching ${endpoint}:`, error);
  console.error(`❌ [Tracking Service] Full URL was: ${fullUrl}`);
  if (error instanceof Error) {
   console.error(`❌ [Tracking Service] Error message: ${error.message}`);
   console.error(`❌ [Tracking Service] Error stack: ${error.stack}`);
  }
  throw error;
 }
};

export const trackingTimeService = {
 getLine: (from: string, to: string) => fetchWithParams('/line', { tanggalfrom: from, tanggalto: to }),
 getRework: (from: string, to: string, idGarment?: string) => fetchWithParams('/rework', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 getQcPqc: (from: string, to: string, idGarment?: string) => fetchWithParams('/qc-pqc', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 getPqcRework: (from: string, to: string, idGarment?: string) => fetchWithParams('/pqc-rework', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 getPqcInDryroom: (from: string, to: string, idGarment?: string) => fetchWithParams('/pqc-indryroom', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 getInDryroomOutDryroom: (from: string, to: string, idGarment?: string) => fetchWithParams('/indryroom-outdryroom', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 getOutDryroomInFolding: (from: string, to: string, idGarment?: string) => fetchWithParams('/outdryroom-infolding', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 getInFoldingOutFolding: (from: string, to: string, idGarment?: string) => fetchWithParams('/infolding-outfolding', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 getLastStatus: (from: string, to: string, idGarment?: string) => fetchWithParams('/last-status', { tanggalfrom: from, tanggalto: to, id_garment: idGarment }),
 // Single query API untuk cycle time - semua data dalam satu response
 getCycleTime: (from: string, to: string) => fetchWithParams('/cycletime', { tanggalfrom: from, tanggalto: to }),
};
