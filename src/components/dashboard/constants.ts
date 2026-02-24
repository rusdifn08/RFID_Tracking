// Konstanta warna untuk dashboard
export const COLORS = {
    green: '#00e676',
    yellow: '#dbc900',
    orange: '#ff9100',
    red: '#ff1744',
    blue: '#2979ff',
    // Warna soft untuk fill titik distribusi
    greenSoft: '#a5f3d0',
    orangeSoft: '#ffcc80',
    redSoft: '#ff8a95',
    // Warna abu ke biruan untuk Sisa Output
    blueGray: '#90a4ae',
} as const;

// Default state untuk popup rework realtime
// true = aktif (popup akan muncul saat rework bertambah) 
// false = nonaktif (popup tidak akan muncul)
export const DEFAULT_REWORK_POPUP_ENABLED = false;

// Default state untuk Room Status Card di Dashboard RFID
// true = aktif (Room Status Card akan tampil di sebelah kanan)
// false = nonaktif (Room Status Card tidak tampil, row 1 dan 2 kembali ke ukuran semula)
export const DEFAULT_ROOM_STATUS_ENABLED = true;

// Default state untuk menampilkan menu About Us
// true = menu About Us akan tampil di sidebar/navigation
// false = menu About Us tidak tampil
export const SHOW_ABOUT_US_MENU = true;
