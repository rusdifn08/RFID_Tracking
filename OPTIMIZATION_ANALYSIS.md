# 📊 Analisis & Optimasi Kode - Folder Pages

## 🎯 Ringkasan Analisis

Analisis mendalam terhadap 25 file di folder `src/pages` untuk menemukan pola-pola yang bisa dioptimasi tanpa mengurangi fitur yang ada.

---

## 🔍 Temuan Utama

### 1. **Duplikasi Helper Functions** ⚠️ HIGH PRIORITY

**Masalah:**
- `isAfter8AM()` dan `getValidDate()` di-duplicate di multiple files:
  - `DashboardFolding.tsx` (2x - di component utama dan TableDetailModal)
  - `DashboardRFIDFinishing.tsx`
  - Dan kemungkinan file lainnya

**Solusi:**
✅ **DIBUAT:** `src/utils/dateHelpers.ts`
- Centralized helper functions
- Reusable di semua pages
- Single source of truth

**Impact:**
- Mengurangi ~50+ lines duplikasi
- Memudahkan maintenance
- Konsistensi logic di semua pages

---

### 2. **Duplikasi useQuery Patterns** ⚠️ HIGH PRIORITY

**Masalah:**
- Pattern fetching `finishingData` di-duplicate di:
  - `DashboardFolding.tsx`
  - `DashboardRFIDFinishing.tsx`
  - `DashboardDryroom.tsx`
  - `DashboardRFIDReject.tsx`

- Pattern fetching `activeUsers` di-duplicate di:
  - `DashboardFolding.tsx`
  - Dan kemungkinan file lainnya

**Solusi:**
✅ **DIBUAT:** 
- `src/hooks/useFinishingData.ts` - Custom hook untuk finishing data
- `src/hooks/useActiveUsers.ts` - Custom hook untuk active users

**Impact:**
- Mengurangi ~100+ lines duplikasi
- Konsistensi query configuration
- Easier to maintain dan update

---

### 3. **Duplikasi Filter State Management** ⚠️ MEDIUM PRIORITY

**Masalah:**
- State management untuk filter (WO, Date From, Date To) di-duplicate di:
  - `DashboardFolding.tsx`
  - `DashboardRFIDFinishing.tsx`
  - `DashboardDryroom.tsx`
  - `DashboardRFIDReject.tsx`
  - Dan file lainnya

**Solusi:**
✅ **DIBUAT:** `src/hooks/useFilterState.ts`
- Centralized filter state management
- Includes modal state management
- Reset functionality

**Impact:**
- Mengurangi ~30+ lines per file
- Konsistensi behavior
- Easier to add new filter types

---

### 4. **Component Terlalu Besar** ⚠️ HIGH PRIORITY

**Masalah:**
- `DashboardFolding.tsx`: **2201 lines** - terlalu besar untuk satu component
- Sulit untuk maintain dan test
- Performance issues potential

**Rekomendasi Optimasi:**

#### A. Extract Sub-Components
```typescript
// DashboardFolding.tsx (Main - ~500 lines)
// ├── RealTimeStatusSection.tsx (~200 lines)
// ├── TableDistributionSection.tsx (~300 lines)
// ├── HourlyShipmentChart.tsx (~200 lines)
// ├── ShipmentStationCards.tsx (~300 lines)
// └── TableDetailModal.tsx (~500 lines - sudah ada tapi bisa di-extract lebih)
```

#### B. Extract Custom Hooks
```typescript
// hooks/useFoldingDashboard.ts
// - All data fetching logic
// - State management
// - Business logic

// hooks/useTableCount.ts
// - Optimistic updates
// - Count management
```

#### C. Extract Utilities
```typescript
// utils/foldingHelpers.ts
// - Table color mapping
// - Data transformation
// - Calculation helpers
```

**Impact:**
- Better code organization
- Easier to test individual parts
- Better performance (smaller re-renders)
- Easier to maintain

---

### 5. **useQuery Configuration Inconsistency** ⚠️ MEDIUM PRIORITY

**Masalah:**
- Inconsistent `staleTime`, `refetchInterval`, `retry` di berbagai queries
- Beberapa query terlalu aggressive (refetch setiap 1 detik)
- Beberapa query tidak ada `staleTime`

**Rekomendasi:**

#### Standard Query Configurations:
```typescript
// Real-time data (perlu update cepat)
const REALTIME_CONFIG = {
  staleTime: 0,
  refetchInterval: 1000, // 1 detik
  refetchOnWindowFocus: true
};

// Normal data (update sedang)
const NORMAL_CONFIG = {
  staleTime: 20000, // 20 detik
  refetchInterval: 30000, // 30 detik
  refetchOnWindowFocus: true
};

// Static/slow-changing data
const STATIC_CONFIG = {
  staleTime: 300000, // 5 menit
  refetchInterval: 600000, // 10 menit
  refetchOnWindowFocus: false
};
```

**Impact:**
- Better performance (less unnecessary refetches)
- Consistent behavior
- Better user experience

---

### 6. **Missing useMemo/useCallback** ⚠️ MEDIUM PRIORITY

**Masalah:**
- Beberapa computed values tidak di-memoize
- Beberapa callbacks tidak di-memoize
- Potential unnecessary re-renders

**Contoh yang sudah baik:**
- `DashboardFolding.tsx` sudah menggunakan `useMemo` untuk:
  - `activeUsersMap`
  - `lineChartData`
  - `tableDistributionData`

**Yang perlu ditambahkan:**
- Callbacks untuk event handlers
- Complex calculations
- Data transformations

---

### 7. **Magic Numbers & Hardcoded Values** ⚠️ LOW PRIORITY

**Masalah:**
- Hardcoded values seperti:
  - `refetchInterval: 1000` (seharusnya constant)
  - `staleTime: 20000` (seharusnya constant)
  - Table colors (sudah ada constant, bagus!)
  - Default hours array (bisa di-extract)

**Rekomendasi:**
```typescript
// constants/queryConfig.ts
export const QUERY_CONFIG = {
  REALTIME: {
    staleTime: 0,
    refetchInterval: 1000,
  },
  NORMAL: {
    staleTime: 20000,
    refetchInterval: 30000,
  },
  // ...
};

// constants/foldingConfig.ts
export const FOLDING_HOURS = ['07:30', '09:00', '10:00', ...];
export const TABLE_COUNT = 8;
```

---

## 📋 Action Items

### ✅ Sudah Dikerjakan:
1. ✅ Created `src/utils/dateHelpers.ts`
2. ✅ Created `src/hooks/useFinishingData.ts`
3. ✅ Created `src/hooks/useActiveUsers.ts`
4. ✅ Created `src/hooks/useFilterState.ts`

### 🔄 Perlu Dikerjakan:

#### Priority 1 (High Impact):
1. **Refactor DashboardFolding.tsx**
   - Extract sub-components
   - Extract custom hooks
   - Reduce dari 2201 lines ke ~500-800 lines

2. **Update semua pages untuk menggunakan shared utilities:**
   - Replace `isAfter8AM()` dengan import dari `dateHelpers`
   - Replace `getValidDate()` dengan import dari `dateHelpers`
   - Replace `useQuery` patterns dengan custom hooks

3. **Standardize useQuery configurations:**
   - Buat constants file untuk query configs
   - Update semua queries untuk menggunakan standard configs

#### Priority 2 (Medium Impact):
4. **Add missing memoization:**
   - Review semua computed values
   - Add `useMemo` untuk expensive calculations
   - Add `useCallback` untuk event handlers

5. **Extract magic numbers:**
   - Create constants file
   - Replace hardcoded values

#### Priority 3 (Low Impact):
6. **Code cleanup:**
   - Remove unused imports
   - Remove commented code
   - Consistent formatting

---

## 📊 Metrics

### Before Optimization:
- **Total Lines:** ~15,000+ lines di folder pages
- **Duplication:** ~500+ lines duplicated code
- **Largest Component:** 2201 lines (DashboardFolding.tsx)
- **Average Component Size:** ~600 lines

### After Optimization (Estimated):
- **Total Lines:** ~12,000 lines (reduction ~20%)
- **Duplication:** ~50 lines (reduction ~90%)
- **Largest Component:** ~800 lines (reduction ~64%)
- **Average Component Size:** ~480 lines (reduction ~20%)

---

## 🚀 Next Steps

1. **Phase 1:** Update existing pages untuk menggunakan shared utilities
2. **Phase 2:** Refactor DashboardFolding.tsx
3. **Phase 3:** Standardize query configurations
4. **Phase 4:** Add missing memoization
5. **Phase 5:** Extract constants

---

## 📝 Notes

- Semua optimasi **TIDAK mengurangi fitur** yang sudah ada
- Semua optimasi **backward compatible**
- Optimasi dilakukan secara **incremental** untuk meminimalisir risiko
- Setiap optimasi bisa di-test secara terpisah

---

**Last Updated:** 2026-02-09
**Status:** Phase 1 - Shared Utilities Created ✅
