// BioTwin-HIL Master Clinical Firmware v2.0
// Monitoring ECG, PPG, BCG, and PCG simultaneously
const int PIN_ECG = A0; // Electrical
const int PIN_PPG = A1; // Optical
const int PIN_BCG = A2; // Mechanical
const int PIN_PCG = A3; // Acoustic

const int THRESHOLD_ECG = 700; // Heartbeat peak threshold

void setup() {
  Serial.begin(115200);
  pinMode(PIN_ECG, INPUT);
  pinMode(PIN_PPG, INPUT);
  pinMode(PIN_BCG, INPUT);
  pinMode(PIN_PCG, INPUT);

  Serial.println("SYSTEM_STATUS: MULTI_SENSOR_ACTIVE");
  Serial.println("HIL_MODE: CARDIAC_SUITE_V2");
}

void loop() {
  // Read all 4 clinical channels
  int valECG = analogRead(PIN_ECG);
  int valPPG = analogRead(PIN_PPG);
  int valBCG = analogRead(PIN_BCG);
  int valPCG = analogRead(PIN_PCG);

  // Stream formatted values to the dashboard/bridge
  Serial.print("ECG:"); Serial.print(valECG);
  Serial.print(" PPG:"); Serial.print(valPPG);
  Serial.print(" BCG:"); Serial.print(valBCG);
  Serial.print(" PCG:"); Serial.println(valPCG);

  // Heartbeat peak detection based on ECG
  if (valECG > THRESHOLD_ECG) {
    Serial.println("STATUS:HEARTBEAT_DETECTED");
  }

  delay(20); // 50 Hz sampling frequency
}
