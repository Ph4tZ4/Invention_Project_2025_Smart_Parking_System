#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* ssid = "LTC_IOT";
const char* password = "00000000";
const char* serverURL = "http://192.168.1.100:3000/api/parking"; // เปลี่ยนเป็น IP ของคอมพิวเตอร์ที่รันเว็บไซต์

// ===== Parking sensors (Infrared) =====
int irPins[4]   = {32, 33, 25, 26};  // ขาเซ็นเซอร์ IR
int ledGreen[4] = {27, 14, 12, 13};  // ไฟเขียว
int ledRed[4]   = {23, 16, 17, 15};  // ไฟแดง

// ===== Data Storage =====
bool parkingStatus[4] = {false, false, false, false};
bool lastParkingStatus[4] = {false, false, false, false};
unsigned long lastUpdateTime = 0;
const unsigned long updateInterval = 2000; // อัปเดตทุก 2 วินาที

void setup() {
  Serial.begin(115200);
  
  // ===== Pin Setup =====
  for (int i = 0; i < 4; i++) {
    pinMode(irPins[i], INPUT);
    pinMode(ledGreen[i], OUTPUT);
    pinMode(ledRed[i], OUTPUT);
  }
  
  // ===== WiFi Connection =====
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  Serial.println("Parking System Ready");
}

void loop() {
  // ===== Read Parking Sensors =====
  int occupied = 0;
  
  for (int i = 0; i < 4; i++) {
    if (digitalRead(irPins[i]) == LOW) {  // มีรถ (IR ถูกบัง)
      digitalWrite(ledGreen[i], LOW);
      digitalWrite(ledRed[i], HIGH);
      parkingStatus[i] = true;
      occupied++;
    } else {  // ว่าง
      digitalWrite(ledGreen[i], HIGH);
      digitalWrite(ledRed[i], LOW);
      parkingStatus[i] = false;
    }
  }
  
  int available = 4 - occupied;
  
  // ===== Serial Monitor =====
  Serial.print("Occupied: ");
  Serial.print(occupied);
  Serial.print(" | Free: ");
  Serial.println(available);
  
  // ===== Check for Changes =====
  bool hasChanged = false;
  for (int i = 0; i < 4; i++) {
    if (parkingStatus[i] != lastParkingStatus[i]) {
      hasChanged = true;
      lastParkingStatus[i] = parkingStatus[i];
    }
  }
  
  // ===== Send Data to Web Server =====
  if (hasChanged || (millis() - lastUpdateTime > updateInterval)) {
    sendParkingData();
    lastUpdateTime = millis();
  }
  
  delay(200);
}

void sendParkingData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");
    
    // ===== Create JSON Data =====
    DynamicJsonDocument doc(1024);
    JsonArray boardA = doc.createNestedArray("boardA");
    
    for (int i = 0; i < 4; i++) {
      boardA.add(parkingStatus[i]);
    }
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("Sending data to server:");
    Serial.println(jsonString);
    
    // ===== Send POST Request =====
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Server response: " + String(httpResponseCode));
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error sending data: " + String(httpResponseCode));
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected!");
  }
}


