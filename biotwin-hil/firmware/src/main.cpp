#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_BME280.h>

#define MAX30100_ADDR 0x57
#define POT_PIN 4
#define SAMPLE_INTERVAL_MS 100   // 10 Hz sampling
#define HR_BUFFER_SIZE     60    // 6 seconds of data
#define FINGER_THRESHOLD   5000  // IR must be above this

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_BME280 bme;

// ── HR calculation state ──────────────────────────────────────────────────────
uint16_t irBuffer[HR_BUFFER_SIZE];
unsigned long tsBuffer[HR_BUFFER_SIZE];
int bufHead = 0;
int bufCount = 0;
int calculatedHR = 0;

// Simple peak detection on circular buffer
int calculateHR() {
  if (bufCount < 10) return 0;

  // Copy to linear array for processing
  int n = bufCount;
  long irArr[HR_BUFFER_SIZE];
  unsigned long tsArr[HR_BUFFER_SIZE];
  for (int i = 0; i < n; i++) {
    int idx = (bufHead - n + i + HR_BUFFER_SIZE) % HR_BUFFER_SIZE;
    irArr[i] = irBuffer[idx];
    tsArr[i] = tsBuffer[idx];
  }

  // Compute mean
  long sum = 0;
  for (int i = 0; i < n; i++) sum += irArr[i];
  long mean = sum / n;

  // Find peaks (above mean, local max)
  int peakCount = 0;
  unsigned long peakTs[20];
  int lastPeak = -10;

  for (int i = 1; i < n - 1; i++) {
    if (irArr[i] > mean &&
        irArr[i] > irArr[i-1] &&
        irArr[i] > irArr[i+1] &&
        (i - lastPeak) >= 5) {
      if (peakCount < 20) {
        peakTs[peakCount++] = tsArr[i];
      }
      lastPeak = i;
    }
  }

  if (peakCount < 2) return 0;

  // Average interval between peaks
  unsigned long totalMs = 0;
  for (int i = 1; i < peakCount; i++) {
    totalMs += peakTs[i] - peakTs[i-1];
  }
  unsigned long avgMs = totalMs / (peakCount - 1);
  if (avgMs == 0) return 0;

  int bpm = (int)(60000UL / avgMs);
  if (bpm < 30 || bpm > 220) return 0;
  return bpm;
}

// ── MAX30100 raw read ─────────────────────────────────────────────────────────
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

// ── Timing ────────────────────────────────────────────────────────────────────
unsigned long lastSample  = 0;
unsigned long lastSerial  = 0;
unsigned long lastLCD     = 0;
int lcdPage = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Wire.begin(8, 9);

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

  // MAX30100: SPO2 mode, max LED current
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

  // ── Sample IR/RED at 10 Hz ─────────────────────────────────────────────────
  if (now - lastSample >= SAMPLE_INTERVAL_MS) {
    lastSample = now;

    uint16_t ir = 0, red = 0;
    readMAX30100(ir, red);

    if (ir > FINGER_THRESHOLD) {
      // Add to circular buffer
      irBuffer[bufHead] = ir;
      tsBuffer[bufHead] = now;
      bufHead = (bufHead + 1) % HR_BUFFER_SIZE;
      if (bufCount < HR_BUFFER_SIZE) bufCount++;

      // Recalculate HR every 10 samples
      if (bufCount % 5 == 0) {
        int newHR = calculateHR();
        if (newHR > 0) calculatedHR = newHR;
      }
    } else {
      // No finger — reset
      bufHead = 0;
      bufCount = 0;
      calculatedHR = 0;
    }
  }

  // ── Serial JSON every 500ms ───────────────────────────────────────────────
  if (now - lastSerial >= 500) {
    lastSerial = now;

    uint16_t ir = 0, red = 0;
    readMAX30100(ir, red);

    float temp     = bme.readTemperature();
    float humidity = bme.readHumidity();
    float pressure = bme.readPressure() / 100.0F;
    int   stress   = map(analogRead(POT_PIN), 0, 4095, 0, 100);

    // Derive SpO2 from R ratio
    int spo2 = 98;
    if (ir > FINGER_THRESHOLD && red > 100) {
      float ratio = (float)red / (float)ir;
      spo2 = constrain((int)(110 - 25 * ratio), 80, 100);
    }

    Serial.print("{");
    Serial.print("\"heart_rate\":"); Serial.print(calculatedHR);
    Serial.print(",\"spo2\":");      Serial.print(spo2);
    Serial.print(",\"ir\":");        Serial.print(ir);
    Serial.print(",\"red\":");       Serial.print(red);
    Serial.print(",\"temperature\":"); Serial.print(temp, 2);
    Serial.print(",\"humidity\":");    Serial.print(humidity, 2);
    Serial.print(",\"pressure\":");    Serial.print(pressure, 2);
    Serial.print(",\"stress\":");      Serial.print(stress);
    Serial.println("}");
  }

  // ── LCD every 3s ─────────────────────────────────────────────────────────
  if (now - lastLCD >= 3000) {
    lastLCD = now;

    uint16_t ir = 0, red = 0;
    readMAX30100(ir, red);

    lcd.clear();
    switch (lcdPage) {
      case 0:
        lcd.setCursor(0,0); lcd.print("HR:"); lcd.print(calculatedHR); lcd.print(" bpm");
        lcd.setCursor(0,1); lcd.print("SpO2:"); lcd.print(ir > FINGER_THRESHOLD ? (int)(110 - 25*(float)red/ir) : 0); lcd.print("%");
        break;
      case 1:
        lcd.setCursor(0,0); lcd.print("IR:"); lcd.print(ir);
        lcd.setCursor(0,1); lcd.print("RED:"); lcd.print(red);
        break;
      case 2:
        lcd.setCursor(0,0); lcd.print("T:"); lcd.print(bme.readTemperature(),1); lcd.print("C");
        lcd.setCursor(0,1); lcd.print("H:"); lcd.print(bme.readHumidity(),0); lcd.print("%");
        break;
      case 3:
        lcd.setCursor(0,0); lcd.print("Pressure:");
        lcd.setCursor(0,1); lcd.print((int)(bme.readPressure()/100)); lcd.print(" hPa");
        break;
    }
    lcdPage = (lcdPage + 1) % 4;
  }
}
