# 🏥 NFC Patient Monitoring System

An IoT-based smart healthcare monitoring system using **ESP32**, **PN532 NFC Module**, **Node.js**, and **PostgreSQL** for real-time patient identification and monitoring.

The system allows hospital staff to scan NFC-enabled patient wristbands and instantly retrieve patient information, treatment history, medications, and monitoring records through a live web dashboard.

---

# 📌 Features

✅ NFC-based patient identification  
✅ Real-time patient monitoring dashboard  
✅ Patient registration system  
✅ Timestamp-based scan history  
✅ Medication and treatment tracking  
✅ Emergency alert monitoring  
✅ Secure login authentication using bcrypt  
✅ PostgreSQL database integration  
✅ ESP32 automatic WiFi reconnection  
✅ REST API communication between ESP32 and server

---

# 🛠️ Technologies Used

| Category | Technologies |
|----------|--------------|
| Hardware | ESP32, PN532 NFC Module |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Frontend | HTML, CSS, JavaScript |
| Firmware | Arduino IDE (C++) |
| Communication | HTTP, SPI |
| Security | bcrypt |

---

# 📂 Project Structure

```bash
nfc-patient-monitoring-system-project/
│
├── esp32/
│   └── esp32_nfc_scanner.ino
│
├── public/
│   └── index.html
│
├── screenshots/
│   ├── dashboard.png
│   ├── pgadmin.png
│   ├── serial-monitor.png
│   └── hardware-setup.jpg
│
├── server.js
├── package.json
├── package-lock.json
├── pg_enhanced.sql
├── .gitignore
├── .env
└── README.md
```

---

# ⚙️ Hardware Components

| Component | Description |
|-----------|-------------|
| ESP32 | Main microcontroller with WiFi support |
| PN532 NFC Module | Reads NFC patient wristbands/tags |
| NFC Tags/Cards | Used as patient identification |
| Jumper Wires | Hardware connections |
| USB Cable | ESP32 programming and power |

---

# 🔌 Circuit Connections

## PN532 ↔ ESP32 Connections

| PN532 Pin | ESP32 Pin |
|-----------|-----------|
| SS / SDA  | GPIO 5 |
| SCK       | GPIO 18 |
| MOSI      | GPIO 23 |
| MISO      | GPIO 19 |
| VCC       | 3.3V |
| GND       | GND |

> ⚠️ Set PN532 module to **SPI mode** before connecting.

---

# 💾 PostgreSQL Database Setup

## Step 1: Create Database

Open **pgAdmin** and create a database named:

```sql
nfc_patient_monitor
```

---

## Step 2: Import SQL File

Open Query Tool and execute:

```bash
pg_enhanced.sql
```

This creates all required tables.

---

# 🚀 Installation & Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/nfc-patient-monitoring-system-project.git
cd nfc-patient-monitoring-system-project
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

Installed packages:

- express
- pg
- bcrypt
- cors
- node-cron

---

## 3️⃣ Configure Environment Variables

Create a `.env` file:

```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nfc_patient_monitor
```

---

## 4️⃣ Run Backend Server

```bash
node server.js
```

Server starts at:

```bash
http://localhost:3000
```

---

# 📡 ESP32 Firmware Setup

## Step 1: Open Arduino IDE

Open:

```bash
esp32/esp32_nfc_scanner.ino
```

---

## Step 2: Install Required Libraries

Install from Arduino Library Manager:

- Adafruit PN532
- WiFi
- HTTPClient

---

## Step 3: Update WiFi Credentials

```cpp
#define WIFI_SSID      "Your_WiFi_Name"
#define WIFI_PASSWORD  "Your_WiFi_Password"

#define SERVER_IP      "192.168.x.x"
#define SERVER_PORT    "3000"
```

---

## Step 4: Upload Code

- Select ESP32 Board
- Select COM Port
- Click Upload

---

# 📡 API Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/api/nfc-scan` | Receive NFC UID from ESP32 |
| POST | `/api/login` | User authentication |
| POST | `/api/register` | Register patient |
| GET | `/api/patients` | Get all patients |
| GET | `/api/alerts` | Get emergency alerts |

---

# 🔄 System Workflow

```text
Patient NFC Wristband
          ↓
ESP32 + PN532 scans tag
          ↓
ESP32 sends UID to Node.js server
          ↓
Server fetches patient data from PostgreSQL
          ↓
Dashboard updates in real time
          ↓
Hospital staff monitor patient details
```

---

# 📸 Project Screenshots

## Dashboard

![Dashboard](screenshots/dashboard.png)

---

## PostgreSQL Database

![Database](screenshots/pgadmin.png)

---

## Serial Monitor Output

![Serial Monitor](screenshots/serial-monitor.png)

---

## Hardware Setup

![Hardware](screenshots/hardware-setup.jpg)

---

# 🔒 Security Features

- bcrypt password hashing
- Environment variable support
- Login tracking
- Secure REST API communication

> ⚠️ Never upload real passwords or secrets to GitHub.

---

# 🎯 Future Improvements

- RFID/NFC wristband integration
- Live patient vitals monitoring
- Cloud deployment
- Doctor mobile application
- SMS emergency alerts
- Role-based authentication

---

# 📄 License

This project is developed for educational and healthcare demonstration purposes.

---

# 👩‍💻 Author

Developed by **Shilpa Kunkala**  
Embedded Systems & IoT Enthusiast 🚀
