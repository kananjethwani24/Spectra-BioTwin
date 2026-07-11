#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Adafruit_MPU6050 mpu;

void setup()
{
    Serial.begin(115200);
    Wire.begin(8, 9);

    if (!mpu.begin())
    {
        Serial.println("MPU6050 NOT FOUND");
        while (1);
    }

    Serial.println("MPU6050 READY");
}

void loop()
{
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    Serial.print("AX: ");
    Serial.print(a.acceleration.x);
    Serial.print(" AY: ");
    Serial.print(a.acceleration.y);
    Serial.print(" AZ: ");
    Serial.println(a.acceleration.z);

    delay(500);
}