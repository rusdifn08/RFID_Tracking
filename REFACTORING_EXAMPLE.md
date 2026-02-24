# 🔧 Contoh Refactoring - DashboardFolding.tsx

## 📋 Sebelum vs Sesudah

### Contoh 1: Helper Functions

#### ❌ SEBELUM (Duplikasi):
```typescript
// DashboardFolding.tsx - Line 57-75
const isAfter8AM = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 8;
};

const getValidDate = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (!isAfter8AM()) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return today;
};

// TableDetailModal - Line 1704-1720 (DUPLIKASI!)
const isAfter8AM = () => {
  // ... same code
};

const getValidDate = () => {
  // ... same code
};
```

#### ✅ SESUDAH (Menggunakan Shared Utility):
```typescript
// DashboardFolding.tsx
import { isAfter8AM, getValidDate } from '../utils/dateHelpers';

// Langsung bisa digunakan, tidak perlu define lagi
const validDate = getValidDate();
```

**Benefits:**
- ✅ Mengurangi ~30 lines duplikasi
- ✅ Single source of truth
- ✅ Mudah di-maintain

---

### Contoh 2: useQuery Pattern untuk Finishing Data

#### ❌ SEBELUM (Duplikasi di multiple files):
```typescript
// DashboardFolding.tsx
const { data: finishingResponse, refetch: refetchFinishingData } = useQuery({
  queryKey: ['finishing-data-folding'],
  queryFn: async () => {
    const response = await getFinishingData();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Gagal mengambil data finishing');
    }
    return response.data;
  },
  staleTime: 20000,
  refetchInterval: 1000,
  refetchOnWindowFocus: true,
  retry: 3,
});

// DashboardRFIDFinishing.tsx (DUPLIKASI!)
const { data: finishingResponse, refetch: refetchFinishingData } = useQuery({
  queryKey: ['finishing-data'],
  queryFn: async () => {
    const response = await getFinishingData();
    if (!response.success || !response.data) throw new Error(response.error || 'Fetch Error');
    return response.data;
  },
  refetchInterval: 30000,
  retry: 3,
});
```

#### ✅ SESUDAH (Menggunakan Custom Hook):
```typescript
// DashboardFolding.tsx
import { useFinishingData } from '../hooks/useFinishingData';

const { data: finishingResponse, refetch: refetchFinishingData } = useFinishingData({
  refetchInterval: 1000, // Custom untuk real-time
  staleTime: 20000,
});

// DashboardRFIDFinishing.tsx
import { useFinishingData } from '../hooks/useFinishingData';

const { data: finishingResponse, refetch: refetchFinishingData } = useFinishingData({
  refetchInterval: 30000, // Custom untuk normal refresh
});
```

**Benefits:**
- ✅ Mengurangi ~15 lines per file
- ✅ Konsistensi error handling
- ✅ Mudah di-update (ubah di satu tempat)

---

### Contoh 3: Active Users Pattern

#### ❌ SEBELUM:
```typescript
// DashboardFolding.tsx - Line 110-140
const { data: activeUsersResponse, refetch: refetchActiveUsers } = useQuery({
  queryKey: ['active-users-folding'],
  queryFn: async () => {
    const response = await getActiveUsers();
    if (!response.success || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [response.data];
  },
  refetchInterval: 10000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  retry: 2,
});

useEffect(() => {
  refetchActiveUsers();
}, [refetchActiveUsers]);

const activeUsersMap = useMemo(() => {
  const map = new Map<string, { nik: string; name: string; line: string }>();
  if (activeUsersResponse) {
    activeUsersResponse.forEach((user) => {
      map.set(user.line, { nik: user.nik, name: user.name, line: user.line });
    });
  }
  return map;
}, [activeUsersResponse]);
```

#### ✅ SESUDAH:
```typescript
// DashboardFolding.tsx
import { useActiveUsers } from '../hooks/useActiveUsers';

const { activeUsers, activeUsersMap, refetch: refetchActiveUsers } = useActiveUsers({
  refetchInterval: 10000,
});
```

**Benefits:**
- ✅ Mengurangi ~30 lines
- ✅ Auto-conversion ke Map
- ✅ Consistent behavior

---

### Contoh 4: Filter State Management

#### ❌ SEBELUM:
```typescript
// DashboardFolding.tsx - Line 94-102
const [filterWo, setFilterWo] = useState<string>('');
const [filterDateFrom, setFilterDateFrom] = useState<string>('');
const [filterDateTo, setFilterDateTo] = useState<string>('');
const [showWoFilterModal, setShowWoFilterModal] = useState(false);
const [showDateFilterModal, setShowDateFilterModal] = useState(false);

// DashboardRFIDFinishing.tsx (DUPLIKASI!)
const [filterWo, setFilterWo] = useState<string>('');
const [filterDateFrom, setFilterDateFrom] = useState<string>('');
const [filterDateTo, setFilterDateTo] = useState<string>('');
const [showWoFilterModal, setShowWoFilterModal] = useState(false);
const [showDateFilterModal, setShowDateFilterModal] = useState(false);
```

#### ✅ SESUDAH:
```typescript
// DashboardFolding.tsx
import { useFilterState } from '../hooks/useFilterState';

const {
  filterState: { wo: filterWo, dateFrom: filterDateFrom, dateTo: filterDateTo },
  modalState: { showWoFilter: showWoFilterModal, showDateFilter: showDateFilterModal },
  setFilterWo,
  setFilterDateFrom,
  setFilterDateTo,
  setShowWoFilter,
  setShowDateFilter,
  resetFilters
} = useFilterState();
```

**Benefits:**
- ✅ Mengurangi ~10 lines per file
- ✅ Organized state management
- ✅ Built-in reset functionality

---

## 🎯 Step-by-Step Refactoring Guide

### Step 1: Update Imports
```typescript
// Add these imports
import { isAfter8AM, getValidDate } from '../utils/dateHelpers';
import { useFinishingData } from '../hooks/useFinishingData';
import { useActiveUsers } from '../hooks/useActiveUsers';
import { useFilterState } from '../hooks/useFilterState';
```

### Step 2: Remove Duplicate Functions
```typescript
// DELETE these:
// const isAfter8AM = () => { ... };
// const getValidDate = () => { ... };
```

### Step 3: Replace useQuery Patterns
```typescript
// REPLACE:
// const { data: finishingResponse } = useQuery({ ... });

// WITH:
const { data: finishingResponse } = useFinishingData({ ... });
```

### Step 4: Replace State Management
```typescript
// REPLACE multiple useState calls with:
const { filterState, modalState, ... } = useFilterState();
```

### Step 5: Test
- ✅ Verify semua fitur masih bekerja
- ✅ Check console untuk errors
- ✅ Test semua interactions

---

## 📊 Impact Summary

### Lines Reduced per File:
- **DashboardFolding.tsx:** ~100 lines
- **DashboardRFIDFinishing.tsx:** ~50 lines
- **DashboardDryroom.tsx:** ~50 lines
- **DashboardRFIDReject.tsx:** ~50 lines

### Total Reduction:
- **~250 lines** dari 4 file utama
- **~20% reduction** dalam code size
- **Better maintainability** dan consistency

---

## ⚠️ Important Notes

1. **Backward Compatible:** Semua perubahan backward compatible
2. **No Feature Loss:** Tidak ada fitur yang dihapus
3. **Incremental:** Bisa di-refactor satu file per satu
4. **Test Thoroughly:** Pastikan semua fitur masih bekerja setelah refactoring

---

**Last Updated:** 2026-02-09
