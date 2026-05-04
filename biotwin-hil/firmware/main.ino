// BioTwin-HIL Firmware v1.0 (Arduino Uno Version)
const int SENSOR_PIN = A0;
const int THRESHOLD = 700; 

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_PIN, INPUT);
  
  Serial.println("SYSTEM_READY");
  Serial.println("CONFIG:MODE_HIL_UNO");
}

void loop() {
  int sensorValue = analogRead(SENSOR_PIN);
  
  // Stream to dashboard
  Serial.print("V:"); 
  Serial.println(sensorValue);
  
  if (sensorValue > THRESHOLD) {
    Serial.println("STATUS:HEARTBEAT_DETECTED");
  }
  
  delay(20); 
}
