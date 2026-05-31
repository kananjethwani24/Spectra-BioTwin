import os
import json
import logging
import google.generativeai as genai # type: ignore
import uuid
from rag_pipeline import get_context

logging.basicConfig(level=logging.WARNING)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def validate_persona(persona: dict) -> dict:
    """
    Schema enforcer for generated personas.
    """
    required_fields = ["persona_id", "display_name", "age", "sex", "hr_bpm", "hr_min", "hr_max",
                       "conditions", "noise_level", "signal_params"]
    
    missing_fields = [f for f in required_fields if f not in persona]
    if missing_fields:
        raise ValueError(f"Missing required fields: {missing_fields}")
    
    # Clamp hr_bpm
    persona["hr_bpm"] = max(20, min(300, persona["hr_bpm"]))
    
    # Clamp noise_level
    persona["noise_level"] = max(0.0, min(1.0, float(persona["noise_level"])))
    
    # Ensure hr_min < hr_bpm < hr_max
    if not (persona["hr_min"] < persona["hr_bpm"] < persona["hr_max"]):
        logging.warning(f"Fixing hr bounds for bpm {persona['hr_bpm']}")
        persona["hr_min"] = persona["hr_bpm"] - 20
        persona["hr_max"] = persona["hr_bpm"] + 30
        
    # Ensure signal_params.ecg.qt_interval_ms in [300, 500]
    try:
        qt = persona["signal_params"]["ecg"]["qt_interval_ms"]
        if qt < 300 or qt > 500:
            logging.warning(f"Fixing qt_interval_ms {qt}")
            persona["signal_params"]["ecg"]["qt_interval_ms"] = max(300, min(500, qt))
    except KeyError:
        pass
        
    return persona

def generate_persona(condition: str, complexity: int = 3) -> dict:
    if not GEMINI_API_KEY:
        logging.warning("GEMINI_API_KEY not set. Returning fallback mock persona.")
        return validate_persona({
            "persona_id": str(uuid.uuid4()),
            "display_name": f"Mock {condition.capitalize()} Patient",
            "age": 45,
            "sex": "M",
            "hr_bpm": 80 if "fibrillation" not in condition.lower() else 140,
            "hr_min": 60,
            "hr_max": 100,
            "weight_kg": 75.0,
            "conditions": [condition],
            "arrhythmia_type": "AF" if "fibrillation" in condition.lower() else None,
            "noise_level": 0.05,
            "complexity_score": complexity,
            "signal_params": {
                "ecg": {"pr_interval_ms": 160, "qrs_duration_ms": 100, "qt_interval_ms": 400},
                "spo2": {"baseline_pct": 98.0, "variability": 1.0}
            }
        })
        
    context = get_context(condition)
    
    system_instruction = '''You are a clinical data generator for medical device testing.
Return ONLY valid JSON matching this exact schema — no preamble, no markdown fences:
{"persona_id": "uuid4-string", "display_name": "string", "age": int, "sex": "M|F|X",
"hr_bpm": int, "hr_min": int, "hr_max": int, "weight_kg": float,
"conditions": ["string"], "arrhythmia_type": "string|null", "noise_level": float,
"complexity_score": 1-5,
"signal_params": {"ecg": {"pr_interval_ms": int, "qrs_duration_ms": int, "qt_interval_ms": int},
"spo2": {"baseline_pct": float, "variability": float}}}.
CONSTRAINTS: hr_bpm 20-300. qt_interval_ms 300-500. Never hallucinate.'''

    prompt = f"Clinical Context: {context}\nGenerate a patient persona for condition: {condition} with complexity {complexity}."
    
    model = genai.GenerativeModel('gemini-2.5-pro', system_instruction=system_instruction)
    
    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            text = response.text.replace('```json', '').replace('```', '').strip()
            data = json.loads(text)
            
            try:
                uuid.UUID(data.get("persona_id", ""))
            except:
                data["persona_id"] = str(uuid.uuid4())
                
            return validate_persona(data)
        except json.JSONDecodeError:
            if attempt == 1:
                raise
        except Exception as e:
            if attempt == 1:
                raise

if __name__ == "__main__":
    try:
        p1 = generate_persona("Normal")
        print(f"Normal: {p1['display_name']} ({p1['hr_bpm']} bpm)")
        
        p2 = generate_persona("Atrial Fibrillation")
        print(f"AF: {p2['display_name']} ({p2['hr_bpm']} bpm)")
        
        p3 = generate_persona("STEMI")
        print(f"STEMI: {p3['display_name']} ({p3['hr_bpm']} bpm)")
        
        print("\nTesting validate_persona constraints...")
        test_p = p1.copy()
        test_p["hr_bpm"] = 350
        test_p = validate_persona(test_p)
        print(f"Clamped HR: {test_p['hr_bpm']} (expected 300)")
        
    except Exception as e:
        print(f"Test failed: {e}")
