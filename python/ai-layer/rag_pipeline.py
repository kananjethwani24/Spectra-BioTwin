def get_context(condition: str) -> str:
    """
    RAG stub: Hardcoded dict mapping conditions to clinical_ranges.
    """
    knowledge_base = {
        "normal": "Healthy adult. HR: 60-100 bpm. PR interval: 120-200 ms. QRS: 80-120 ms. QT: 350-440 ms. SpO2: 95-100%.",
        "atrial_fibrillation": "Irregularly irregular rhythm. HR often 100-175 bpm (rapid ventricular response). Absence of P waves. PR interval: N/A. QRS: normal. QT: variable.",
        "stemi": "ST-segment elevation myocardial infarction. HR variable but often elevated due to pain/sympathetic tone. QRS normal. QT may be prolonged. Requires immediate intervention."
    }
    
    cond_key = condition.lower()
    for k in knowledge_base:
        if k in cond_key:
            return knowledge_base[k]
    
    return "General medical patient profile. HR 60-100 bpm. Standard ECG parameters."
