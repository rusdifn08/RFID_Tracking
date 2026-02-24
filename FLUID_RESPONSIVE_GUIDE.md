# 🎨 Panduan Fluid Responsive Design untuk Dashboard

## 📐 Konsep Fluid Responsiveness

**Fluid Responsive Design** adalah pendekatan CSS modern yang membuat elemen UI (icon, font, spacing) secara otomatis menyesuaikan ukuran berdasarkan resolusi layar tanpa menggunakan breakpoint statis. Ini memastikan tampilan **padat dan konsisten** di berbagai resolusi.

### **Mengapa Menggunakan `clamp()`?**

```css
/* Format: clamp(min-value, preferred-value, max-value) */
clamp(20px, 2.5vw + 10px, 48px)
```

- **Min-value**: Ukuran minimum (untuk layar kecil)
- **Preferred-value**: Formula dinamis berdasarkan viewport
- **Max-value**: Ukuran maksimum (untuk layar besar)

**Keuntungan:**
- ✅ Tidak perlu banyak breakpoint
- ✅ Transisi halus antar resolusi
- ✅ Konsisten di semua device
- ✅ Mengurangi white space berlebihan

---

## 🎯 Target Resolusi

- **720p (HD)**: 1280 × 720px
- **1080p (Full HD)**: 1920 × 1080px

**Rasio**: 1080p adalah **1.5x** lebih besar dari 720p

---

## 📏 Formula Clamp untuk Icon Size

### **Status Card Icons (QC/PQC Cards)**

```css
/* Icon size untuk StatusCard */
width: clamp(20px, 2.5vw + 8px, 48px);
height: clamp(20px, 2.5vw + 8px, 48px);
```

**Penjelasan:**
- **720p (1280px)**: `2.5vw = 32px` → `32px + 8px = 40px` (dalam range)
- **1080p (1920px)**: `2.5vw = 48px` → `48px + 8px = 56px` → **clamp ke 48px** (max)
- **Hasil**: Icon membesar dari 40px (720p) ke 48px (1080p) secara smooth

### **Output Sewing Card Icon**

```css
/* Icon size untuk OutputSewingCard */
width: clamp(28px, 3vw + 10px, 68px);
height: clamp(28px, 3vw + 10px, 68px);
```

**Penjelasan:**
- **720p**: `3vw = 38.4px` → `38.4px + 10px = 48.4px`
- **1080p**: `3vw = 57.6px` → `57.6px + 10px = 67.6px` → **clamp ke 68px** (max)

### **Room Status Icons (Droplets, Package, XCircle)**

```css
/* Icon size untuk RoomStatusCard */
width: clamp(10px, 1.2vw + 4px, 18px);
height: clamp(10px, 1.2vw + 4px, 18px);
```

**Penjelasan:**
- **720p**: `1.2vw = 15.36px` → `15.36px + 4px = 19.36px` → **clamp ke 18px** (max)
- **1080p**: `1.2vw = 23.04px` → `23.04px + 4px = 27.04px` → **clamp ke 18px** (max)

---

## 📝 Formula Clamp untuk Font Size

### **Card Title (Label)**

```css
/* Font size untuk label card (GOOD, REWORK, dll) */
font-size: clamp(0.5rem, 1.2vw + 0.3rem, 0.875rem);
```

**Penjelasan:**
- **720p**: `1.2vw = 15.36px` → `15.36px + 4.8px = 20.16px` (≈ 1.26rem)
- **1080p**: `1.2vw = 23.04px` → `23.04px + 4.8px = 27.84px` → **clamp ke 14px** (0.875rem)
- **Hasil**: Font membesar dari 20px (720p) ke 14px (1080p) - **lebih kecil karena proporsi**

### **Count Number (Angka Besar)**

```css
/* Font size untuk angka count */
font-size: clamp(1.5rem, 4vw + 0.5rem, 4.5rem);
```

**Penjelasan:**
- **720p**: `4vw = 51.2px` → `51.2px + 8px = 59.2px` (≈ 3.7rem)
- **1080p**: `4vw = 76.8px` → `76.8px + 8px = 84.8px` → **clamp ke 72px** (4.5rem)
- **Hasil**: Angka membesar dari 59px (720p) ke 72px (1080p)

### **Data Line Card Label**

```css
/* Font size untuk label di DataLineCard */
font-size: clamp(0.625rem, 1vw + 0.4rem, 0.875rem);
```

**Penjelasan:**
- **720p**: `1vw = 12.8px` → `12.8px + 6.4px = 19.2px` (≈ 1.2rem)
- **1080p**: `1vw = 19.2px` → `19.2px + 6.4px = 25.6px` → **clamp ke 14px** (0.875rem)

### **Data Line Card Value**

```css
/* Font size untuk value di DataLineCard */
font-size: clamp(0.5rem, 1.2vw + 0.2rem, 0.875rem);
```

**Penjelasan:**
- **720p**: `1.2vw = 15.36px` → `15.36px + 3.2px = 18.56px` (≈ 1.16rem)
- **1080p**: `1.2vw = 23.04px` → `23.04px + 3.2px = 26.24px` → **clamp ke 14px** (0.875rem)

---

## 🎨 Formula Clamp untuk Padding & Gap

### **Card Padding**

```css
/* Padding untuk card */
padding: clamp(0.5rem, 1.5vw + 0.25rem, 1.5rem);
```

**Penjelasan:**
- **720p**: `1.5vw = 19.2px` → `19.2px + 4px = 23.2px` (≈ 1.45rem)
- **1080p**: `1.5vw = 28.8px` → `28.8px + 4px = 32.8px` → **clamp ke 24px** (1.5rem)

### **Gap Antar Elemen**

```css
/* Gap untuk spacing */
gap: clamp(0.25rem, 0.8vw + 0.1rem, 1rem);
```

**Penjelasan:**
- **720p**: `0.8vw = 10.24px` → `10.24px + 1.6px = 11.84px` (≈ 0.74rem)
- **1080p**: `0.8vw = 15.36px` → `15.36px + 1.6px = 16.96px` → **clamp ke 16px** (1rem)

---

## 🔧 Implementasi di Komponen

### **1. StatusCard.tsx**

```tsx
// Icon size dengan clamp()
<img
    src={style.iconSrc}
    alt={displayLabel}
    style={{
        width: 'clamp(20px, 2.5vw + 8px, 48px)',
        height: 'clamp(20px, 2.5vw + 8px, 48px)'
    }}
    className="group-hover:scale-110 transition-transform duration-300 object-contain"
/>

// Label font size
<h3 style={{
    fontSize: 'clamp(0.5rem, 1.2vw + 0.3rem, 0.875rem)',
    color: labelColor
}}>{displayLabel}</h3>

// Count font size
<span style={{
    fontSize: 'clamp(1.5rem, 4vw + 0.5rem, 4.5rem)',
    color: countColor
}}>{count}</span>
```

### **2. OutputSewingCard.tsx**

```tsx
// Icon size dengan clamp()
<img
    src={outputIcon}
    alt="Output Sewing"
    style={{
        width: 'clamp(28px, 3vw + 10px, 68px)',
        height: 'clamp(28px, 3vw + 10px, 68px)'
    }}
    className="group-hover:scale-110 transition-transform duration-300 object-contain"
/>

// Label font size
<h3 style={{
    fontSize: 'clamp(0.5rem, 1.2vw + 0.3rem, 0.875rem)',
    color: '#2979ff'
}}>Sewing Output</h3>

// Count font size
<span style={{
    fontSize: 'clamp(1.5rem, 4vw + 0.5rem, 4.5rem)',
    color: '#2563eb'
}}>{outputLine || 0}</span>
```

### **3. DataLineCard.tsx**

```tsx
// Label font size
<span style={{
    fontSize: 'clamp(0.625rem, 1vw + 0.4rem, 0.875rem)',
    color: '#2563eb'
}}>{item.label}</span>

// Value font size
<span style={{
    fontSize: 'clamp(0.5rem, 1.2vw + 0.2rem, 0.875rem)',
    lineHeight: '1.1'
}}>{item.value || '-'}</span>
```

### **4. RoomStatusCard.tsx**

```tsx
// Icon size dengan clamp()
<Droplets style={{
    width: 'clamp(10px, 1.2vw + 4px, 18px)',
    height: 'clamp(10px, 1.2vw + 4px, 18px)'
}} strokeWidth={2.5} stroke="#0284C7" />

// Label font size
<h3 style={{
    fontSize: 'clamp(0.5rem, 1.2vw + 0.3rem, 0.875rem)'
}}>Dryroom</h3>

// Value font size
<span style={{
    fontSize: 'clamp(0.625rem, 1.2vw + 0.4rem, 1rem)'
}}>{dryroomData.waiting}</span>
```

---

## 📊 Perbandingan: Sebelum vs Sesudah

### **Sebelum (Breakpoint Statis)**

```css
/* Masalah: Jump tiba-tiba antar breakpoint */
.icon {
    width: 20px;  /* Mobile */
}
@media (min-width: 640px) {
    .icon { width: 24px; }  /* xs */
}
@media (min-width: 768px) {
    .icon { width: 36px; }  /* md - JUMP BESAR! */
}
@media (min-width: 1024px) {
    .icon { width: 40px; }  /* lg */
}
```

**Masalah:**
- ❌ Jump tiba-tiba dari 24px ke 36px
- ❌ Tidak smooth antar resolusi
- ❌ White space berlebihan di 1080p

### **Sesudah (Fluid dengan clamp())**

```css
/* Solusi: Smooth scaling */
.icon {
    width: clamp(20px, 2.5vw + 8px, 48px);
}
```

**Keuntungan:**
- ✅ Smooth scaling dari 720p ke 1080p
- ✅ Tidak ada jump tiba-tiba
- ✅ Padat dan konsisten di semua resolusi

---

## 🎯 Strategi untuk Tampilan Padat

### **1. Mengurangi Padding & Gap**

```css
/* Sebelum */
padding: 1.5rem;  /* 24px di semua resolusi */

/* Sesudah */
padding: clamp(0.5rem, 1.5vw + 0.25rem, 1.5rem);
/* 720p: ~23px, 1080p: 24px (max) */
```

### **2. Mengoptimalkan Font Size**

```css
/* Sebelum */
font-size: 1.5rem;  /* 24px di semua resolusi */

/* Sesudah */
font-size: clamp(1rem, 2vw + 0.5rem, 1.5rem);
/* 720p: ~20px, 1080p: 24px (max) */
```

### **3. Mengoptimalkan Icon Size**

```css
/* Sebelum */
width: 48px;  /* Fixed di semua resolusi */

/* Sesudah */
width: clamp(20px, 2.5vw + 8px, 48px);
/* 720p: ~40px, 1080p: 48px (max) */
```

---

## 🔍 Tips & Best Practices

### **1. Gunakan Viewport Width (vw) untuk Horizontal Scaling**

```css
/* ✅ Baik: Menggunakan vw untuk scaling horizontal */
font-size: clamp(1rem, 2vw + 0.5rem, 2rem);
```

### **2. Kombinasikan vw dengan rem untuk Fleksibilitas**

```css
/* ✅ Baik: vw untuk scaling, rem untuk base */
padding: clamp(0.5rem, 1.5vw + 0.25rem, 1.5rem);
```

### **3. Set Min & Max yang Realistis**

```css
/* ✅ Baik: Min dan max yang masuk akal */
font-size: clamp(0.875rem, 1.2vw + 0.3rem, 1.125rem);

/* ❌ Buruk: Range terlalu besar */
font-size: clamp(0.5rem, 5vw + 1rem, 3rem);
```

### **4. Test di Multiple Resolusi**

- ✅ Test di 720p (1280×720)
- ✅ Test di 1080p (1920×1080)
- ✅ Test di resolusi antara (1440×900, 1600×900)
- ✅ Test di mobile (375×667, 414×896)

---

## 📐 Formula Reference

### **Icon Sizes**

| Komponen | Formula | 720p | 1080p |
|----------|---------|------|-------|
| StatusCard | `clamp(20px, 2.5vw + 8px, 48px)` | 40px | 48px |
| OutputSewingCard | `clamp(28px, 3vw + 10px, 68px)` | 48px | 68px |
| RoomStatusCard | `clamp(10px, 1.2vw + 4px, 18px)` | 18px | 18px |

### **Font Sizes**

| Elemen | Formula | 720p | 1080p |
|--------|---------|------|-------|
| Card Label | `clamp(0.5rem, 1.2vw + 0.3rem, 0.875rem)` | 20px | 14px |
| Count Number | `clamp(1.5rem, 4vw + 0.5rem, 4.5rem)` | 59px | 72px |
| Data Label | `clamp(0.625rem, 1vw + 0.4rem, 0.875rem)` | 19px | 14px |
| Data Value | `clamp(0.5rem, 1.2vw + 0.2rem, 0.875rem)` | 19px | 14px |

### **Spacing**

| Elemen | Formula | 720p | 1080p |
|--------|---------|------|-------|
| Card Padding | `clamp(0.5rem, 1.5vw + 0.25rem, 1.5rem)` | 23px | 24px |
| Gap | `clamp(0.25rem, 0.8vw + 0.1rem, 1rem)` | 12px | 16px |

---

## 🚀 Quick Start

1. **Ganti semua ukuran statis dengan clamp()**
2. **Test di 720p dan 1080p**
3. **Adjust formula jika perlu**
4. **Pastikan tidak ada white space berlebihan**

---

**Dokumentasi ini dibuat untuk memastikan tampilan dashboard padat dan konsisten di semua resolusi!** 🎨
