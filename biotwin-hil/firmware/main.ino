#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_BME280.h>

#define MAX30100_ADDR 0x57
#define POT_PIN 4

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_BME280 bme;

unsigned long lastSerialUpdate = 0;
unsigned long lastLCDUpdate = 0;

int page = 0;

// Read MAX30100 FIFO
bool readMAX30100(uint16_t &ir, uint16_t &red)
{
    Wire.beginTransmission(MAX30100_ADDR);
    Wire.write(0x05);
    
    if (Wire.endTransmission(false) != 0)
        return false;

    Wire.requestFrom(MAX30100_ADDR, 4);

    if (Wire.available() != 4)
        return false;

    ir = ((uint16_t)Wire.read() << 8) | Wire.read();
    red = ((uint16_t)Wire.read() << 8) | Wire.read();

    return true;
}

void setup()
{
    Serial.begin(115200);

    while (!Serial)
    {
        ;
    }

    delay(2000);

    Wire.begin(8, 9);

    Serial.println("=== BIO-TWIN START ===");

    // LCD
    lcd.init();
    lcd.backlight();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("BIO-TWIN");
    lcd.setCursor(0, 1);
    lcd.print("Booting...");

    // BME280
    if (!bme.begin(0x76))
    {
        Serial.println("BME280 FAILED");

        lcd.clear();
        lcd.print("BME FAIL");

        while (1);
    }

    // Configure MAX30100
    Wire.beginTransmission(MAX30100_ADDR);
    Wire.write(0x06);      // MODE CONFIG
    Wire.write(0x03);      // SPO2 MODE
    Wire.endTransmission();

    Wire.beginTransmission(MAX30100_ADDR);
    Wire.write(0x09);      // LED CONFIG
    Wire.write(0xFF);      // Max current
    Wire.endTransmission();

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Sensors Ready");

    Serial.println("MAX30100 READY");
    Serial.println("BME280 READY");

    delay(2000);
}

void loop()
{
    uint16_t ir = 0;
    uint16_t red = 0;

    readMAX30100(ir, red);

    float temperature = bme.readTemperature();
    float humidity = bme.readHumidity();
    float pressure = bme.readPressure() / 100.0F;

    int potValue = analogRead(POT_PIN);

    int stress = map(potValue, 0, 4095, 0, 100);

    // Serial JSON every second
    if (millis() - lastSerialUpdate > 1000)
    {
        Serial.print("{");

        Serial.print("\"ir\":");
        Serial.print(ir);

        Serial.print(",\"red\":");
        Serial.print(red);

        Serial.print(",\"temperature\":");
        Serial.print(temperature, 2);

        Serial.print(",\"humidity\":");
        Serial.print(humidity, 2);

        Serial.print(",\"pressure\":");
        Serial.print(pressure, 2);

        Serial.print(",\"stress\":");
        Serial.print(stress);

        Serial.println("}");

        lastSerialUpdate = millis();
    }

    // LCD rotation every 3 sec
    if (millis() - lastLCDUpdate > 3000)
    {
        lcd.clear();

        switch (page)
        {
            case 0:
                lcd.setCursor(0, 0);
                lcd.print("IR:");
                lcd.print(ir);

                lcd.setCursor(0, 1);
                lcd.print("RED:");
                lcd.print(red);
                break;

            case 1:
                lcd.setCursor(0, 0);
                lcd.print("Temp:");
                lcd.print(temperature, 1);
                lcd.print("C");

                lcd.setCursor(0, 1);
                lcd.print("Hum:");
                lcd.print(humidity, 0);
                lcd.print("%");
                break;

            case 2:
                lcd.setCursor(0, 0);
                lcd.print("Pressure:");

                lcd.setCursor(0, 1);
                lcd.print((int)pressure);
                lcd.print(" hPa");
                break;

            case 3:
                lcd.setCursor(0, 0);
                lcd.print("Stress:");

                lcd.setCursor(0, 1);
                lcd.print(stress);
                lcd.print("%");
                break;
        }

        page++;

        if (page > 3)
            page = 0;

        lastLCDUpdate = millis();
    }
}