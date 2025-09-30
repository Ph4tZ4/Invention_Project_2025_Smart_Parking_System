#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* ssid = "LTC_IOT";
const char* password = "";

// ===== Server Configuration =====
const char* serverURL = "http://172.29.60.39:3000/api/parking";

// ===== Parking sensors (Infrared) =====
int irPins[4] = {32, 33, 25, 26};
int ledGreen[4] = {27, 14, 12, 13};
int ledRed[4] = {23, 16, 17, 15};

// ===== Parking data =====
bool boardB[4] = {false, false, false, false}; // false = ว่าง, true = ไม่ว่าง
unsigned long lastUpdate = 0;
unsigned long lastWiFiCheck = 0;
const unsigned long updateInterval = 3000; // อัปเดตทุก 3 วินาที
const unsigned long wifiCheckInterval = 5000; // ตรวจ WiFi ทุก 5 วินาที

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== Board B Starting ===");
  
  // ตั้งค่า GPIO
  for (int i = 0; i < 4; i++) {
    pinMode(irPins[i], INPUT_PULLUP); // ใช้ pullup เพื่อลด noise
    pinMode(ledGreen[i], OUTPUT);
    pinMode(ledRed[i], OUTPUT);
    // Test LEDs
    digitalWrite(ledGreen[i], HIGH);
    digitalWrite(ledRed[i], HIGH);
  }
  
  delay(500);
  
  // ปิด LED ทั้งหมด
  for (int i = 0; i < 4; i++) {
    digitalWrite(ledGreen[i], LOW);
    digitalWrite(ledRed[i], LOW);
  }

  // เชื่อมต่อ WiFi
  connectWiFi();
  
  Serial.println("Parking System Ready");
  Serial.println("Board B - Slots B1-B4");
  Serial.println("=======================\n");
}

void loop() {
  // ตรวจสอบและ reconnect WiFi
  if (millis() - lastWiFiCheck >= wifiCheckInterval) {
    checkWiFi();
    lastWiFiCheck = millis();
  }
  
  // อ่านค่าเซ็นเซอร์
  readSensors();
  
  // อัปเดต LED
  updateLEDs();
  
  // ส่งข้อมูลไปยังเซิร์ฟเวอร์
  if (millis() - lastUpdate >= updateInterval) {
    sendDataToServer();
    lastUpdate = millis();
  }
  
  delay(100);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n✗ WiFi connection failed!");
  }
}

void checkWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectWiFi();
  }
}

void readSensors() {
  for (int i = 0; i < 4; i++) {
    // อ่านค่า IR sensor (LOW = มีรถ, HIGH = ว่าง)
    bool currentReading = (digitalRead(irPins[i]) == LOW);
    
    // ตรวจสอบการเปลี่ยนแปลง
    if (currentReading != boardB[i]) {
      boardB[i] = currentReading;
      Serial.print("→ Slot B");
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.println(boardB[i] ? "OCCUPIED ●" : "AVAILABLE ○");
    }
  }
}

void updateLEDs() {
  for (int i = 0; i < 4; i++) {
    if (boardB[i]) { // ไม่ว่าง
      digitalWrite(ledGreen[i], LOW);
      digitalWrite(ledRed[i], HIGH);
    } else { // ว่าง
      digitalWrite(ledGreen[i], HIGH);
      digitalWrite(ledRed[i], LOW);
    }
  }
}

void sendDataToServer() {
  // ตรวจสอบ WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected, skipping update");
    return;
  }

  Serial.println("\n--- Sending to Server ---");
  Serial.print("URL: ");
  Serial.println(serverURL);

  HTTPClient http;
  http.setTimeout(5000); // 5 วินาที timeout
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");

  // สร้าง JSON data
  StaticJsonDocument<256> doc;
  JsonArray boardBArray = doc.createNestedArray("boardB");
  
  for (int i = 0; i < 4; i++) {
    boardBArray.add(boardB[i]);
  }

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.print("Data: ");
  Serial.println(jsonString);

  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.print("✓ Response: ");
    Serial.print(httpResponseCode);
    Serial.print(" - ");
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.print(httpResponseCode);
    Serial.print(" - ");
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
  Serial.println("------------------------\n");
}