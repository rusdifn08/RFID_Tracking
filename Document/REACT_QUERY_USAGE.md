# Dokumentasi Penggunaan React Query dengan API

## 📦 Install Dependencies

Pertama, install dependencies yang diperlukan:

```bash
npm install
```

Ini akan menginstall `@tanstack/react-query` yang sudah ditambahkan ke `package.json`.

## 🚀 Setup

React Query sudah di-setup di `src/main.tsx`. Tidak perlu konfigurasi tambahan.

## 📡 API Endpoints

### 1. Login
- **Endpoint**: `POST /api/auth/login`
- **Body**: 
  ```json
  {
    "nik": "1234567890",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "token": "mock-token-1234567890",
      "user": {
        "nik": "1234567890",
        "name": "John Doe",
        "role": "admin"
      }
    }
  }
  ```

### 2. Production Data
- **Endpoint**: `GET /api/production/data`
- **Query Params** (optional): `?lineId=1`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "overall": {
        "good": 45,
        "reject": 18,
        "rework": 8,
        "hasper": 12,
        "total": 83
      },
      "byLine": {
        "line1": { "good": 12, "reject": 9, "rework": 2, ... },
        "line2": { "good": 15, "reject": 5, "rework": 1, ... }
      }
    }
  }
  ```

## 🎣 Hooks yang Tersedia

### Authentication Hooks

#### `useLogin()`
Hook untuk melakukan login.

```typescript
import { useLogin } from '../hooks/useAuth';

const loginMutation = useLogin();

// Gunakan di form submit
const handleLogin = () => {
  loginMutation.mutate({
    nik: '1234567890',
    password: 'password123'
  });
};

// Status
loginMutation.isPending  // true saat loading
loginMutation.isSuccess  // true saat berhasil
loginMutation.isError    // true saat error
loginMutation.data       // response data
loginMutation.error      // error object
```

#### `useAuth()`
Hook untuk mendapatkan data user yang sedang login.

```typescript
import { useAuth } from '../hooks/useAuth';

const { isAuthenticated, token, user } = useAuth();

// user berisi: { nik, name, role }
```

#### `useLogout()`
Hook untuk logout.

```typescript
import { useLogout } from '../hooks/useAuth';

const logout = useLogout();

// Panggil untuk logout
logout();
```

### Production Data Hooks

#### `useProductionData(lineId?)`
Hook untuk mendapatkan production data.

```typescript
import { useProductionData } from '../hooks/useProductionData';

// Get all data
const { data, isLoading, isError } = useProductionData();

// Get by line
const { data, isLoading, isError } = useProductionData(1);
```

#### `useProductionDataOverall()`
Hook untuk mendapatkan overall data.

```typescript
import { useProductionDataOverall } from '../hooks/useProductionData';

const { data, isLoading, isError } = useProductionDataOverall();
```

#### `useProductionDataByLine(lineId)`
Hook untuk mendapatkan data by line.

```typescript
import { useProductionDataByLine } from '../hooks/useProductionData';

const { data, isLoading, isError } = useProductionDataByLine(1);
```

## 💻 Contoh Penggunaan

### Contoh 1: Login Form

```typescript
import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';

function LoginForm() {
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ nik, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={nik}
        onChange={(e) => setNik(e.target.value)}
        placeholder="NIK"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Loading...' : 'Login'}
      </button>
      {loginMutation.isError && (
        <p>Error: {loginMutation.error?.message}</p>
      )}
      {loginMutation.isSuccess && (
        <p>Login berhasil!</p>
      )}
    </form>
  );
}
```

### Contoh 2: Menampilkan Production Data

```typescript
import { useProductionData } from '../hooks/useProductionData';

function ProductionDashboard() {
  const { data, isLoading, isError } = useProductionData();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data</div>;

  return (
    <div>
      <h2>Production Statistics</h2>
      <div>
        <p>Good: {data?.overall.good}</p>
        <p>Reject: {data?.overall.reject}</p>
        <p>Rework: {data?.overall.rework}</p>
        <p>Total: {data?.overall.total}</p>
      </div>
    </div>
  );
}
```

### Contoh 3: Production Data by Line

```typescript
import { useProductionDataByLine } from '../hooks/useProductionData';

function LineStats({ lineId }: { lineId: number }) {
  const { data, isLoading } = useProductionDataByLine(lineId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Line {lineId}</h3>
      <p>Good: {data?.good}</p>
      <p>Reject: {data?.reject}</p>
      <p>Rework: {data?.rework}</p>
    </div>
  );
}
```

## 📝 Test Credentials

Gunakan credentials berikut untuk testing:

1. **Admin**
   - NIK: `1234567890`
   - Password: `password123`

2. **Operator**
   - NIK: `0987654321`
   - Password: `admin123`

3. **User**
   - NIK: `1111111111`
   - Password: `user123`

## 🔧 File yang Dibuat

1. **`src/hooks/useAuth.ts`** - Hooks untuk authentication
2. **`src/hooks/useProductionData.ts`** - Hooks untuk production data
3. **`src/components/ExampleUsage.tsx`** - Contoh komponen penggunaan
4. **`src/main.tsx`** - Setup React Query Provider
5. **`src/config/api.ts`** - Update dengan fungsi login dan production data
6. **`server.js`** - Update dengan endpoint login dan production data

## 🎯 Fitur React Query

- ✅ Automatic caching
- ✅ Background refetching
- ✅ Loading states
- ✅ Error handling
- ✅ Retry logic
- ✅ Stale time management

