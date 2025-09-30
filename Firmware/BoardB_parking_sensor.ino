#include <Arduino.h>

// ===== Parking sensors (Infrared) =====
int irPins[4]   = {32, 33, 25, 26};       // ขาเซ็นเซอร์ IR
int ledGreen[4] = {27, 14, 12, 13};       // ไฟเขียว
int ledRed[4]   = {23, 22, 21, 15};       // ไฟแดง

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 4; i++) {
    pinMode(irPins[i], INPUT);
    pinMode(ledGreen[i], OUTPUT);
    pinMode(ledRed[i], OUTPUT);
  }

  Serial.println("Parking System Ready");
}

void loop() {
  int occupied = 0;

  // --- Parking LEDs ---
  for (int i = 0; i < 4; i++) {
    if (digitalRead(irPins[i]) == LOW) {  // มีรถ (IR ถูกบัง)
      digitalWrite(ledGreen[i], LOW);
      digitalWrite(ledRed[i], HIGH);
      occupied++;
    } else {  // ว่าง
      digitalWrite(ledGreen[i], HIGH);
      digitalWrite(ledRed[i], LOW);
    }
  }

  int available = 4 - occupied;

  // --- Serial Monitor ---
  Serial.print("Occupied: ");
  Serial.print(occupied);
  Serial.print(" | Free: ");
  Serial.println(available);

  delay(200);
}
