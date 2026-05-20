#include <SPI.h>
#include <Adafruit_PN532.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

#define WIFI_SSID      "Bandham437"
#define WIFI_PASSWORD  "123456789"

#define SERVER_IP      "192.168.43.253"
#define SERVER_PORT    3000

#define PN532_SS_PIN   5
#define LED_PIN        2

#define COOLDOWN_MS    3000

// ═══════════════════════════════════════════════════════════
// GLOBALS
// ═══════════════════════════════════════════════════════════

Adafruit_PN532 nfc(PN532_SS_PIN);

String lastUID = "";
unsigned long lastScanTime = 0;

// ═══════════════════════════════════════════════════════════
// LED BLINK
// ═══════════════════════════════════════════════════════════

void blink(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(onMs);

    digitalWrite(LED_PIN, LOW);
    delay(offMs);
  }
}

// ═══════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════

void hr() {
  Serial.println("------------------------------------------------");
}

// ═══════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================");
  Serial.println(" NFC PATIENT MONITOR - ESP32");
  Serial.println("========================================\n");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // ─── WIFI CONNECT ────────────────────────────────────────

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[WiFi] Connecting");

  int tries = 0;

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");

    tries++;

    if (tries > 40) {
      Serial.println("\n[WiFi] Failed! Restarting...");
      ESP.restart();
    }
  }

  Serial.println("\n[WiFi] Connected!");
  Serial.print("[WiFi] IP Address: ");
  Serial.println(WiFi.localIP());

  // ─── NFC INIT ────────────────────────────────────────────

  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();

  if (!versiondata) {
    Serial.println("[NFC] PN532 not found!");

    while (1) {
      blink(1, 100, 100);
    }
  }

  Serial.println("[NFC] PN532 Ready!");

  nfc.SAMConfig();

  blink(3, 200, 200);

  Serial.println("\n[READY] Scan NFC Tag...");
  hr();
}

// ═══════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════

void loop() {

  // ─── WIFI CHECK ──────────────────────────────────────────

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("[WiFi] Reconnecting...");
    WiFi.reconnect();

    delay(3000);
    return;
  }

  // ─── READ NFC TAG ────────────────────────────────────────

  uint8_t uid[7];
  uint8_t uidLength;

  bool success = nfc.readPassiveTargetID(
                   PN532_MIFARE_ISO14443A,
                   uid,
                   &uidLength,
                   100
                 );

  if (!success) return;

  // ─── CONVERT UID TO STRING ───────────────────────────────

  String uidString = "";

  for (uint8_t i = 0; i < uidLength; i++) {

    if (uid[i] < 0x10)
      uidString += "0";

    uidString += String(uid[i], HEX);
  }

  uidString.toUpperCase();

  // ─── DUPLICATE PREVENTION ────────────────────────────────

  unsigned long now = millis();

  if (uidString == lastUID &&
      (now - lastScanTime) < COOLDOWN_MS) {
    return;
  }

  lastUID = uidString;
  lastScanTime = now;

  // ─── DISPLAY ─────────────────────────────────────────────

  Serial.println("\n[NFC] Tag Detected");
  Serial.print("[UID] ");
  Serial.println(uidString);

  digitalWrite(LED_PIN, HIGH);

  // ─── SEND TO SERVER ──────────────────────────────────────

  sendToServer(uidString);

  digitalWrite(LED_PIN, LOW);

  hr();
}

// ═══════════════════════════════════════════════════════════
// SEND TAG TO SERVER
// ═══════════════════════════════════════════════════════════

void sendToServer(String patientID) {

  HTTPClient http;

  String url =
    "http://" +
    String(SERVER_IP) +
    ":" +
    String(SERVER_PORT) +
    "/api/nfc-scan";

  String jsonData =
    "{\"patient_id\":\"" +
    patientID +
    "\"}";

  Serial.print("[HTTP] POST -> ");
  Serial.println(url);

  http.begin(url);

  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonData);

  // ─── RESPONSE ────────────────────────────────────────────

  if (httpCode > 0) {

    String response = http.getString();

    Serial.print("[HTTP] Code: ");
    Serial.println(httpCode);

    Serial.println("[SERVER RESPONSE]");
    Serial.println(response);

    if (httpCode == 200) {

      Serial.println("[SUCCESS] Data Sent!");

      blink(2, 300, 200);

    } else if (httpCode == 404) {

      Serial.println("[ERROR] Patient Not Found!");

      blink(5, 100, 100);

    } else {

      Serial.println("[ERROR] Server Error!");
    }

  } else {

    Serial.print("[HTTP ERROR] ");
    Serial.println(http.errorToString(httpCode));

    Serial.println("Check:");
    Serial.println("1. server.js running?");
    Serial.println("2. SERVER_IP correct?");
    Serial.println("3. Same WiFi network?");

    blink(10, 50, 50);
  }

  http.end();
}