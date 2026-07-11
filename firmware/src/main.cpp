#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <LiquidCrystal_I2C.h>

#define MAX30100_ADDR 0x57
#define POT_PIN 4
#define BUZZER_PIN 2
#define SAMPLE_INTERVAL_MS 100
#define HR_BUFFER_SIZE 60
#define FINGER_THRESHOLD 5000

Adafruit_MPU6050 mpu;
Adafruit_BME280 bme;
LiquidCrystal_I2C lcd(0x27, 16, 2);

uint16_t irBuffer[HR_BUFFER_SIZE];
unsigned long tsBuffer[HR_BUFFER_SIZE];
int bufHead = 0, bufCount = 0, calculatedHR = 0;

int calculateHR() {
  if (bufCount < 10) return 0;
  int n = bufCount;
  long irArr[HR_BUFFER_SIZE];
  unsigned long tsArr[HR_BUFFER_SIZE];
  for (int i = 0; i < n; i++) {
    int idx = (bufHead - n + i + HR_BUFFER_SIZE) % HR_BUFFER_SIZE;
    irArr[i] = irBuffer[idx];
    tsArr[i] = tsBuffer[idx];
  }
  long sum = 0;
  for (int i = 0; i < n; i++) sum += irArr[i];
  long mean = sum / n;
  int peakCount = 0;
  unsigned long peakTs[20];
  int lastPeak = -10;
  for (int i = 1; i < n - 1; i++) {
    if (irArr[i] > mean && irArr[i] > irArr[i-1] && irArr[i] > irArr[i+1] && (i - lastPeak) >= 5) {
      if (peakCount < 20) peakTs[peakCount++] = tsArr[i];
      lastPeak = i;
    }
  }
  if (peakCount < 2) return 0;
  unsigned long totalMs = 0;
  for (int i = 1; i < peakCount; i++) totalMs += peakTs[i] - peakTs[i-1];
  unsigned long avgMs = totalMs / (peakCount - 1);
  if (avgMs == 0) return 0;
  int bpm = (int)(60000UL / avgMs);
  return (bpm < 30 || bpm > 220) ? 0 : bpm;
}

bool readMAX30100(uint16_t &ir, uint16_t &red) {
  Wire.beginTransmission(MAX30100_ADDR);
  Wire.write(0x05);
  if (Wire.endTransmission(false) != 0) return false;
  Wire.requestFrom(MAX30100_ADDR, 4);
  if (Wire.available() != 4) return false;
  ir  = ((uint16_t)Wire.read() << 8) | Wire.read();
  red = ((uint16_t)Wire.read() << 8) | Wire.read();
  return true;
}

unsigned long lastSample = 0, lastSerial = 0, lastLCD = 0;
int lcdPage = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(8, 9);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("BIO-TWIN");
  lcd.setCursor(0, 1); lcd.print("Booting...");

  if (!bme.begin(0x76)) {
    Serial.println("{\"error\":\"BME280 not found\"}");
    lcd.clear(); lcd.print("BME FAIL");
    while (1);
  }

  if (!mpu.begin()) {
    Serial.println("{\"error\":\"MPU6050 not found\"}");
    lcd.clear(); lcd.print("MPU FAIL");
    while (1);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  Wire.beginTransmission(MAX30100_ADDR);
  Wire.write(0x06); Wire.write(0x03);
  Wire.endTransmission();
  Wire.beginTransmission(MAX30100_ADDR);
  Wire.write(0x09); Wire.write(0xFF);
  Wire.endTransmission();

  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("Sensors OK");
  lcd.setCursor(0, 1); lcd.print("Place finger...");
  Serial.println("=== BIO-TWIN READY ===");
}

void loop() {
  unsigned long now = millis();

  if (now - lastSample >= SAMPLE_INTERVAL_MS) {
    lastSample = now;
    uint16_t ir = 0, red = 0;
    readMAX30100(ir, red);
    if (ir > FINGER_THRESHOLD) {
      irBuffer[bufHead] = ir;
      tsBuffer[bufHead] = now;
      bufHead = (bufHead + 1) % HR_BUFFER_SIZE;
      if (bufCount < HR_BUFFER_SIZE) bufCount++;
      if (bufCount % 5 == 0) {
        int newHR = calculateHR();
        if (newHR > 0) calculatedHR = newHR;
      }
    } else {
      bufHead = 0; bufCount = 0; calculatedHR = 0;
    }
  }

  if (now - lastSerial >= 500) {
    lastSerial = now;

    uint16_t ir = 0, red = 0;
    readMAX30100(ir, red);

    float temp     = bme.readTemperature();
    float humidity = bme.readHumidity();
    float pressure = bme.readPressure() / 100.0F;
    int   stress   = map(analogRead(POT_PIN), 0, 4095, 0, 100);

    // Buzzer beeps continuously if stress > 50
    if (stress > 50) {
      tone(BUZZER_PIN, 1000, 200);  // 1kHz tone, 200ms beep every 500ms cycle
    } else {
      noTone(BUZZER_PIN);
      digitalWrite(BUZZER_PIN, LOW);
    }

    int spo2 = 98;
    if (ir > FINGER_THRESHOLD && red > 100) {
      float ratio = (float)red / (float)ir;
      spo2 = constrain((int)(110 - 25 * ratio), 80, 100);
    }

    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);

    Serial.print("{");
    Serial.print("\"heart_rate\":"); Serial.print(calculatedHR);
    Serial.print(",\"spo2\":");      Serial.print(spo2);
    Serial.print(",\"ir\":");        Serial.print(ir);
    Serial.print(",\"red\":");       Serial.print(red);
    Serial.print(",\"temperature\":"); Serial.print(temp, 2);
    Serial.print(",\"humidity\":");    Serial.print(humidity, 2);
    Serial.print(",\"pressure\":");    Serial.print(pressure, 2);
    Serial.print(",\"stress\":");      Serial.print(stress);
    Serial.print(",\"accel_x\":");     Serial.print(a.acceleration.x, 2);
    Serial.print(",\"accel_y\":");     Serial.print(a.acceleration.y, 2);
    Serial.print(",\"accel_z\":");     Serial.print(a.acceleration.z, 2);
    Serial.print(",\"gyro_x\":");      Serial.print(g.gyro.x, 2);
    Serial.print(",\"gyro_y\":");      Serial.print(g.gyro.y, 2);
    Serial.print(",\"gyro_z\":");      Serial.print(g.gyro.z, 2);
    Serial.println("}");
  }

  if (now - lastLCD >= 3000) {
    lastLCD = now;
    uint16_t ir = 0, red = 0;
    readMAX30100(ir, red);
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    lcd.clear();
    switch (lcdPage) {
      case 0: {
        int lcdSpo2 = ir > FINGER_THRESHOLD ? constrain((int)(110-25*(float)red/ir),80,100) : 0;
        lcd.setCursor(0,0); lcd.print("HR:"); lcd.print(calculatedHR); lcd.print(" bpm");
        lcd.setCursor(0,1); lcd.print("SpO2:"); lcd.print(lcdSpo2); lcd.print("%");
        break;
      }
      case 1:
        lcd.setCursor(0,0); lcd.print("T:"); lcd.print(bme.readTemperature(),1); lcd.print("C");
        lcd.setCursor(0,1); lcd.print("H:"); lcd.print(bme.readHumidity(),0); lcd.print("%");
        break;
      case 2:
        lcd.setCursor(0,0); lcd.print("AX:"); lcd.print(a.acceleration.x,1);
        lcd.setCursor(0,1); lcd.print("AY:"); lcd.print(a.acceleration.y,1);
        break;
      case 3:
        lcd.setCursor(0,0); lcd.print("GX:"); lcd.print(g.gyro.x,1);
        lcd.setCursor(0,1); lcd.print("GY:"); lcd.print(g.gyro.y,1);
        break;
    }
    lcdPage = (lcdPage + 1) % 4;
  }
}
