# Backend Integration Guide — PKRKABMAS

Dokumentasi integrasi frontend dengan backend PKRKABMAS.

## 1. Overview

Backend menyediakan REST API dan WebSocket untuk kebutuhan:

- Admin authentication
- Dashboard monitoring
- Sensor monitoring
- GPS tracking
- Geofence monitoring
- Sensor history
- Data export (Excel dan CSV)
- Real-time sensor and GPS updates

Frontend berkomunikasi dengan backend melalui HTTP API dan WebSocket.

Frontend tidak perlu mengakses database secara langsung.

## 2. Backend Configuration

### Local development

Jika frontend dan backend dijalankan pada laptop yang sama:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

Backend dijalankan dari folder:

```bash
cd apps/api
npm install
npm run dev
```

Base URL:

```text
http://localhost:3000
```

WebSocket URL:

```text
ws://localhost:3000
```

Pastikan backend sudah berjalan sebelum menguji fitur frontend.

## 3. Authentication

### Admin login

**Endpoint**

```http
POST /api/auth/login
Content-Type: application/json
```

**Request body**

```json
{
  "email": "admin@pkrkabmas.local",
  "password": "<ADMIN_PASSWORD>"
}
```

Password admin diberikan secara terpisah kepada tim frontend. Jangan menyimpan password di repository.

**Successful response**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "user": {
      "id": "<USER_ID>",
      "name": "<USER_NAME>",
      "email": "admin@pkrkabmas.local",
      "role": "admin"
    }
  }
}
```

JWT berlaku selama 8 jam.

### Admin authorization

Untuk endpoint yang memerlukan autentikasi, sertakan token pada HTTP header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Jika token tidak valid atau kedaluwarsa, frontend perlu meminta admin login kembali.

## 4. API Endpoints

### A. Public endpoints

Endpoint berikut dapat diakses tanpa login.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend health check |
| POST | `/api/auth/login` | Admin login |
| GET | `/api/dashboard/overview` | Dashboard overview |
| GET | `/api/sensors` | Active sensor list |
| GET | `/api/sensors/latest` | Latest sensor readings |
| GET | `/api/locations/latest` | Latest GPS locations |
| GET | `/api/locations/history` | GPS history |
| GET | `/api/locations/status` | Geofence status |

### B. Admin-only endpoints

Semua endpoint berikut membutuhkan JWT admin.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/history` | Sensor measurement history |
| GET | `/api/export/excel` | Export sensor data to Excel |
| GET | `/api/export/csv` | Export sensor data to CSV |
| PATCH | `/api/locations/geofence` | Update geofence configuration |

### C. Device-only endpoints

Endpoint berikut bukan untuk frontend. Endpoint ini digunakan oleh perangkat untuk mengirimkan data ke backend menggunakan device API key.

| Method | Endpoint | Authentication |
|---|---|---|
| POST | `/api/readings` | Device API key |
| POST | `/api/locations` | Device API key |

Device API key dikirim melalui header:

```http
x-api-key: <DEVICE_API_KEY>
```

Jangan menggunakan atau menyimpan device API key di frontend.

## 5. Dashboard

### GET `/api/dashboard/overview`

Akses: Public.

Digunakan untuk menampilkan ringkasan monitoring, termasuk:

- Active devices
- Active sensors
- Latest sensor values
- Latest GPS location
- Geofence status
- Distance from installation point
- Geofence radius

Dashboard hanya menampilkan sensor dan perangkat yang aktif.

## 6. Sensor Monitoring

### GET `/api/sensors`

Akses: Public.

Mengambil daftar sensor aktif dari perangkat aktif.

Informasi sensor meliputi:

- Sensor ID
- Sensor name
- Unit
- Active status
- Created date

### GET `/api/sensors/latest`

Akses: Public.

Mengambil pembacaan sensor terbaru.

Frontend dapat menggunakan endpoint ini untuk menampilkan nilai sensor terkini pada dashboard.

### GET `/api/history`

Akses: Admin.

Query parameters:

| Parameter | Description | Example |
|---|---|---|
| sensorName | Sensor name | `ph` |
| startDate | Start date | `2026-11-01` |
| endDate | End date | `2026-11-06` |

Contoh:

```http
GET /api/history?sensorName=ph&startDate=2026-11-01&endDate=2026-11-06
```

Response berisi informasi sensor, jumlah record, dan data pengukuran.

Rentang tanggal menggunakan WIB (UTC+7).

## 7. GPS Monitoring

### GET `/api/locations/latest`

Akses: Public.

Mengambil lokasi GPS terbaru untuk perangkat.

Response berisi:

- Device ID
- Device name
- Latest location
- Latitude
- Longitude
- Accuracy
- Recorded timestamp

### GET `/api/locations/history`

Akses: Public.

Query parameters:

| Parameter | Required | Description |
|---|---|---|
| deviceId | Yes | Device ID |
| startDate | Yes | Start date (`YYYY-MM-DD`) |
| endDate | Yes | End date (`YYYY-MM-DD`) |

Contoh:

```http
GET /api/locations/history?deviceId=<DEVICE_ID>&startDate=2026-11-01&endDate=2026-11-06
```

### GET `/api/locations/status`

Akses: Public.

Query parameter:

```text
deviceId=<DEVICE_ID>
```

Endpoint ini memberikan status geofence dan informasi lokasi terkini.

Geofence status:

| Status | Description |
|---|---|
| SAFE | Device berada dalam batas aman |
| ALERT | Device terdeteksi di luar batas geofence |
| GPS_UNCERTAIN | Akurasi GPS tidak cukup untuk menentukan status |
| NO_GPS_DATA | Belum ada data GPS |
| NOT_CONFIGURED | Geofence belum dikonfigurasi |

Batas akurasi GPS yang digunakan backend adalah 30 meter.

### PATCH `/api/locations/geofence`

Akses: Admin.

Request body:

```json
{
  "deviceId": "<DEVICE_ID>",
  "latitude": -7.2575,
  "longitude": 112.7521,
  "radiusMeters": 100
}
```

Latitude harus berada pada rentang -90 sampai 90, longitude -180 sampai 180, dan radius lebih dari 0 sampai 100.000 meter.

## 8. Data Export

Kedua endpoint berikut hanya dapat diakses admin.

### Excel

```http
GET /api/export/excel?sensorName=all&startDate=2026-11-01&endDate=2026-11-06
```

### CSV

```http
GET /api/export/csv?sensorName=all&startDate=2026-11-01&endDate=2026-11-06
```

Query parameters:

| Parameter | Description |
|---|---|
| sensorName | `all` atau nama sensor tertentu |
| startDate | Start date (`YYYY-MM-DD`) |
| endDate | End date (`YYYY-MM-DD`) |

File berisi kolom:

1. No
2. Sensor
3. Value
4. Unit
5. Recorded At (WIB)
6. Received At (WIB)
7. External ID

**Frontend implementation note:** gunakan response sebagai Blob untuk mengunduh file, bukan memperlakukannya sebagai JSON.

## 9. WebSocket — Real-time Monitoring

WebSocket bersifat public dan tidak membutuhkan JWT.

Connection:

```javascript
const socket = new WebSocket(
  import.meta.env.VITE_WS_URL
);
```

### Event: CONNECTED

```json
{
  "type": "CONNECTED",
  "message": "Connected to PKRKABMAS realtime server"
}
```

### Event: NEW_READING

```json
{
  "type": "NEW_READING",
  "data": {
    "deviceId": "<DEVICE_ID>",
    "sensorName": "ph",
    "value": 7.2,
    "unit": "",
    "recordedAt": "2026-11-06T07:00:00.000Z"
  }
}
```

### Event: NEW_LOCATION

```json
{
  "type": "NEW_LOCATION",
  "data": {
    "deviceId": "<DEVICE_ID>",
    "latitude": -7.2575,
    "longitude": 112.7521,
    "accuracyMeters": 10,
    "recordedAt": "2026-11-06T07:00:00.000Z",
    "geofenceStatus": "SAFE",
    "distanceFromInstallation": 25
  }
}
```

Catatan:

- Backend mengirim event setelah data berhasil disimpan.
- Data duplikat tidak dikirim sebagai event baru.
- Semua client yang terhubung dapat menerima broadcast.
- Frontend sebaiknya menangani reconnect ketika koneksi terputus.

## 10. Recommended Frontend Integration

Disarankan membuat satu API client terpusat agar konfigurasi base URL dan autentikasi konsisten.

Contoh:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

Untuk endpoint admin, tambahkan:

```javascript
Authorization: `Bearer ${token}`
```

Pisahkan kebutuhan data berdasarkan akses:

- Dashboard: public API.
- Sensor latest: public API.
- Sensor history: admin API.
- GPS monitoring: public API.
- Geofence configuration: admin API.
- Export: admin API.
- Real-time monitoring: public WebSocket.

## 11. Error Handling

Frontend perlu menangani HTTP status berikut:

| Status | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Data created successfully |
| 400 | Invalid request or query |
| 401 | Authentication required or invalid credentials |
| 403 | Access forbidden |
| 404 | Resource not found |
| 500 | Internal server error |

Gunakan response dari backend untuk menampilkan pesan kesalahan yang sesuai.

## 12. Security Notes

- Jangan mengakses database secara langsung dari frontend.
- Jangan memasukkan `DATABASE_URL` ke frontend.
- Jangan memasukkan `JWT_SECRET` ke frontend.
- Jangan memasukkan device API key ke frontend.
- Jangan menyimpan password admin dalam source code atau repository.
- Gunakan JWT hanya untuk endpoint admin.
- WebSocket memang bersifat public sesuai rancangan sistem.
- Device data upload hanya dilakukan oleh perangkat yang memiliki API key valid.

## 13. Frontend Integration Checklist

- [ ] Backend dapat diakses dari frontend.
- [ ] Admin login berhasil.
- [ ] JWT tersimpan dan digunakan untuk endpoint admin.
- [ ] Dashboard overview tampil.
- [ ] Sensor list tampil.
- [ ] Latest sensor readings tampil.
- [ ] Sensor history dapat ditampilkan oleh admin.
- [ ] GPS latest tampil.
- [ ] GPS history tampil.
- [ ] Geofence status tampil.
- [ ] Admin dapat mengubah konfigurasi geofence.
- [ ] Admin dapat mengunduh Excel.
- [ ] Admin dapat mengunduh CSV.
- [ ] WebSocket menerima `NEW_READING`.
- [ ] WebSocket menerima `NEW_LOCATION`.

---

**Document purpose:** Technical reference for integrating the PKRKABMAS frontend with the existing backend API.

**Note:** Contoh payload di dokumen ini merupakan ilustrasi format penggunaan. Untuk field response yang lebih lengkap, frontend dapat merujuk pada response aktual dari backend.