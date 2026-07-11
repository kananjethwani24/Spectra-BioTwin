
Step 1: Terminal 1: cd "C:\Users\kanan\Desktop\IoT EL FINAL\biotwin09"
                    docker-compose up -d

Step 2: Terminal 2: & "$env:USERPROFILE\.platformio\penv\Scripts\pio.exe" device monitor --port COM3 --baud 115200

Step 3: Terminal 3: cd "C:\Users\kanan\Desktop\IoT EL FINAL\biotwin09"
                    py python/bio-synths/src/main.py

Step 4: Terminal 4: cd "C:\Users\kanan\Desktop\IoT EL FINAL\biotwin09"
                    npm run dev

─────────────────────────────────────────────────
ThingSpeak Cloud Setup (one-time)
─────────────────────────────────────────────────
1. Go to https://thingspeak.com and sign in (free account).
2. Click  My Channels → New Channel  and create a channel with 7 fields:
      Field 1 : Heart Rate (bpm)
      Field 2 : SpO2 (%)
      Field 3 : Temperature (°C)
      Field 4 : Humidity (%)
      Field 5 : Pressure (hPa)
      Field 6 : Stress (%)
      Field 7 : Health Score (/100)
3. Open the channel → API Keys tab → copy the  Write API Key.
4. Open  .env  (in the biotwin-hil root) and set:
      THINGSPEAK_API_KEY=<paste your Write API Key here>
5. Restart the backend (Step 3 above).
   You will see  [THINGSPEAK] Pushed → entry_id=...  in the terminal
   every 15 seconds while sensor data is being received.

View your live charts at:
   https://thingspeak.com/channels/<YOUR_CHANNEL_ID>