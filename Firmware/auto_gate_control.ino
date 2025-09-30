#include <Arduino.h>
#include <ESP32Servo.h>

// ===== PIN DEFINE =====
// --- ทางเข้า ---
#define BTN_IN     4
#define TRIG_IN    5
#define ECHO_IN    18
#define SERVO_IN   19

// --- ทางออก ---
#define TRIG_OUT   21
#define ECHO_OUT   22
#define SERVO_OUT  23

Servo servoIn, servoOut;
bool gateInOpen = false;
bool gateOutOpen = false;

// ===== FUNCTION: Ultrasonic =====
long getDistance(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duration = pulseIn(echo, HIGH, 30000);
  return duration * 0.034 / 2;
}

void setup() {
  Serial.begin(115200);

  // --- Pin setup ---
  pinMode(BTN_IN, INPUT_PULLUP);

  pinMode(TRIG_IN, OUTPUT);
  pinMode(ECHO_IN, INPUT);
  pinMode(TRIG_OUT, OUTPUT);
  pinMode(ECHO_OUT, INPUT);

  // --- Servo setup ---
  servoIn.attach(SERVO_IN);
  servoOut.attach(SERVO_OUT);
  servoIn.write(90);   // ปิดไม้กั้นเข้า
  servoOut.write(90);  // ปิดไม้กั้นออก
}

void loop() {
  // --- Gate Control (ทางเข้า) ---
  bool buttonPressed = (digitalRead(BTN_IN) == LOW);
  long distIn = getDistance(TRIG_IN, ECHO_IN);

  // ถ้ากดปุ่มและรถอยู่ใกล้กว่า 5 cm → เปิดไม้กั้นเข้า
  if (buttonPressed && distIn > 0 && distIn < 5 && !gateInOpen) {
    servoIn.write(180);   // เปิดไม้กั้นเข้า
    gateInOpen = true;
  }

  // ถ้าไม้กั้นเปิดแล้ว และรถออกไปไกลกว่า 6 cm หรืออ่านค่า 0 → ปิดไม้กั้น
  if (gateInOpen && (distIn == 0 || distIn > 6)) {
    delay(1200);
    servoIn.write(90);    // ปิดไม้กั้นเข้า
    gateInOpen = false;
  }

  // --- Gate Control (ทางออก) ---
  long distOut = getDistance(TRIG_OUT, ECHO_OUT);

  if (distOut > 0 && distOut < 5 && !gateOutOpen) {
    servoOut.write(0);    // เปิดไม้กั้นออก
    gateOutOpen = true;
  }
  if (gateOutOpen && (distOut == 0 || distOut > 6)) {
    delay(1200);
    servoOut.write(90);   // ปิดไม้กั้นออก
    gateOutOpen = false;
  }

  delay(200);
}