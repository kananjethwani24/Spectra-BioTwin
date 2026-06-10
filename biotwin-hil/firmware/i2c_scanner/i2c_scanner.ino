#include <Wire.h>

// Try different pin pairs to find your sensors
// Edit SDA_PIN and SCL_PIN and re-upload each time
#define SDA_PIN 8
#define SCL_PIN 9

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== I2C Scanner ===");
  Serial.printf("Scanning SDA=%d SCL=%d\n", SDA_PIN, SCL_PIN);

  Wire.begin(SDA_PIN, SCL_PIN);

  int found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("Device found at 0x%02X", addr);
      if (addr == 0x76 || addr == 0x77) Serial.print(" <- BME280");
      if (addr == 0x57)                 Serial.print(" <- MAX30102");
      Serial.println();
      found++;
    }
  }

  if (found == 0) {
    Serial.println("No I2C devices found.");
    Serial.println("Try changing SDA_PIN / SCL_PIN at top of file.");
  } else {
    Serial.printf("%d device(s) found.\n", found);
  }
}

void loop() {}
