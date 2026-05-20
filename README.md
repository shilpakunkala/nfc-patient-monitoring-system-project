# 🏥 NFC Patient Monitoring System

A real-time hospital patient monitoring system using **NFC tags**, **ESP32**, **Node.js**, and **PostgreSQL**. Nurses scan a patient's NFC wristband to instantly pull up their profile, vitals, medications, and treatment history on a web dashboard.

---

## 📁 Project Structure

```
nfc-patient-monitor/
├── esp32/
│   └── esp32_nfc_scanner.ino     # ESP32 Arduino firmware
├── public/
│   └── index.html                # Frontend dashboard (HTML/CSS/JS)
├── server.js                     # Node.js + Express backend
├── package-lock.json             # Node dependencies lockfile
└── README.md
```

---

## ✨ Features

- 🔖 **NFC Tag Scanning** — ESP32 + PN532 reads patient wristband tags
- 👤 **Patient Profiles** — View patient details on scan
- 💊 **Medication & Treatment Logs** — Timestamped records
- 🚨 **Emergency Alerts** — Triggered if no scan detected within threshold
- 🔐 **Secure Login** — bcrypt-hashed passwords, login count tracking
- 📊 **Live Dashboard** — Real-time web UI with patient data
- 🔁 **Auto-reconnect** — ESP32 reconnects to WiFi if dropped

---

## 🛠️ Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Hardware    | ESP32, PN532 NFC Module           |
| Firmware    | Arduino C++ (SPI, HTTPClient)     |
| Backend     | Node.js, Express.js               |
| Database    | PostgreSQL (via `pg` pool)        |
| Frontend    | HTML, CSS, Vanilla JavaScript     |
| Security    | bcrypt, node-cron                 |

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/nfc-patient-monitor.git
cd nfc-patient-monitor
```

### 2. Install Node.js Dependencies

```bash
npm install
```

Packages used:
- `express` — Web server
- `pg` — PostgreSQL client
- `bcrypt` — Password hashing
- `cors` — Cross-origin requests
- `node-cron` — Scheduled tasks (emergency alert checks)

### 3. Set Up PostgreSQL Database

1. Open **pgAdmin** and create a database named `abcde_db`
2. Update the connection config in `server.js`:

```js
const pool = new Pool({
  user:     'postgres',
  host:     'localhost',
  database: 'abcde_db',
  password: 'YOUR_PASSWORD',   
  port:     5434,              
});
```


### 4. Run the Server

```bash
node server.js
```

Server starts at: `http://localhost:3000`

### 5. Flash the ESP32

1. Open `esp32/esp32_nfc_scanner.ino` in **Arduino IDE**
2. Install required libraries via Library Manager:
   - `Adafruit PN532`
   - `WiFi` (built-in for ESP32)
3. Update WiFi and server credentials in the sketch:

```cpp
#define WIFI_SSID      "Your_WiFi_Name"
#define WIFI_PASSWORD  "Your_WiFi_Password"
#define SERVER_IP      "192.168.x.x"    // Your PC's local IP
#define SERVER_PORT    3000
```

4. Select your **ESP32 board** and **COM port**, then upload.

### 6. Wiring (ESP32 ↔ PN532)

| PN532 Pin | ESP32 Pin |
|-----------|-----------|
| SS/CS     | GPIO 5    |
| SCK       | GPIO 18   |
| MOSI      | GPIO 23   |
| MISO      | GPIO 19   |
| VCC       | 3.3V      |
| GND       | GND       |

---

## 🔒 Security Best Practices

Avoid hardcoding credentials. Use a `.env` file:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=abcde_db
DB_PORT=5434
WIFI_SSID=your_wifi
WIFI_PASSWORD=your_wifi_pass
```

Add `.env` to `.gitignore` so it's never pushed to GitHub:

```
# .gitignore
.env
node_modules/
```

---

## 📡 API Endpoints

| Method | Route             | Description                        |
|--------|-------------------|------------------------------------|
| POST   | `/api/nfc-scan`   | Receives NFC tag UID from ESP32    |
| POST   | `/api/login`      | User authentication                |
| GET    | `/api/patients`   | Fetch all patients                 |
| POST   | `/api/register`   | Register a new patient             |
| GET    | `/api/alerts`     | Fetch emergency alerts             |

---

## 🚀 How It Works

```
Patient wears NFC wristband
        ↓
ESP32 + PN532 scans tag
        ↓
ESP32 sends HTTP POST with UID → Node.js server
        ↓
Server queries PostgreSQL for patient data
        ↓
Dashboard updates in real time
        ↓
Nurse sees vitals, meds, treatments instantly
```

---


