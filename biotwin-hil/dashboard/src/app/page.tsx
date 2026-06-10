"use client";

import { useTwinState, type TwinState, type SensorMode, type Condition } from "@/hooks/useTwinState";
import { TwinAnalyticsCore, TwinScenarioComparator } from "@/components/TwinAnalytics";
import AIInsights from "@/components/AIInsights";
import ReportViewer from "@/components/ReportViewer";
import ErrorBoundary from "@/components/ErrorBoundary";
import ExaminationControl from "@/components/ExaminationControl";
import PersonaGenerator from "@/components/PersonaGenerator";
import VitalsMonitor from "@/components/VitalsMonitor";
import TwinSandbox from "@/components/TwinSandbox";
import { useState, useEffect } from "react";

// ── Sidebar section wrapper ───────────────────────────────────────────────────

function SidebarSection({
  id, label, active, onClick, children,
}: {
  id: string; label: string; active: boolean;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      {/* Section tab */}
      <button
        onClick={onClick}
        style={{
          width: "100%", textAlign: "left", padding: "12px 18px",
          display: "flex", alignItems: "center", gap: 10,
          background: active ? "rgba(236, 72, 153, 0.06)" : "transparent",
          borderTop: "none", borderRight: "none", borderBottom: "none",
          borderLeft: `3px solid ${active ? "var(--accent-pink)" : "rgba(0,0,0,0.06)"}`,
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const,
          letterSpacing: "0.2em", color: active ? "var(--accent-pink)" : "var(--text-muted)",
        }}>
          {label}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: active ? "var(--accent-pink)" : "rgba(0,0,0,0.15)" }}>
          {active ? "▾" : "▸"}
        </span>
      </button>
    </div>
  );
}

// ── Mock Clinical Patients for Doctor View ────────────────────────────────────

interface ClinicalPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  weight: number;
  condition: Condition;
  status: string;
  vitalSignSummary: string;
}

const MOCK_PATIENTS: ClinicalPatient[] = [
  { id: "PT-7049", name: "Sarah Jenkins", age: 34, gender: "Female", weight: 62, condition: "Normal", status: "Stable", vitalSignSummary: "72 BPM | 98% SpO2" },
  { id: "PT-8812", name: "Robert Miller", age: 68, gender: "Male", weight: 84, condition: "Atrial Fibrillation", status: "Arrhythmic Alert", vitalSignSummary: "135 BPM | 95% SpO2" },
  { id: "PT-2041", name: "Elena Rostova", age: 45, gender: "Female", weight: 58, condition: "STEMI", status: "Critical Risk", vitalSignSummary: "110 BPM | 91% SpO2" },
  { id: "PT-1994", name: "David Cho", age: 29, gender: "Male", weight: 76, condition: "Bradycardia", status: "Monitoring", vitalSignSummary: "42 BPM | 97% SpO2" }
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const {
    twinState, connected, packets, applyPersona, removePersona, isPersonaApplied,
    sensorMode, setSensorMode,
    scenario, setScenario, timeline, setTimeline, prediction,
  } = useTwinState("ws://localhost:8000/ws");

  // Auth states
  const [authRole, setAuthRole] = useState<"patient" | "doctor" | null>(null);
  const [authName, setAuthName] = useState("");
  const [loginTab, setLoginTab] = useState<"patient" | "doctor">("patient");
  
  // Login form values
  const [patId, setPatId] = useState("PT-7049");
  const [patPin, setPatPin] = useState("1234");
  const [docId, setDocId] = useState("DR-9022");
  const [doctorDept, setDoctorDept] = useState("Cardiology");
  const [docPass, setDocPass] = useState("admin");
  const [loginError, setLoginError] = useState("");

  const [examining, setExamining] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "report">("overview");
  const [activeSignal, setActiveSignal] = useState("ECG");
  const [activeSection, setActiveSection] = useState<1 | 2 | 3 | 4>(1);

  // Active patient name for doctor dashboard
  const [activePatientName, setActivePatientName] = useState<string | null>(null);

  // Simulation Logs
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (authRole) {
      setLogs([
        `[${new Date().toLocaleTimeString()}] Secure session established for ${authName}.`,
        `[${new Date().toLocaleTimeString()}] Digital Twin core initialized.`,
        `[${new Date().toLocaleTimeString()}] Hardware communication port scanning active.`
      ]);
    }
  }, [authRole, authName]);

  const startExamination = async (code: string, signal: string) => {
    setActiveSignal(signal);
    setExamining(true);
    
    // Add logging
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Launching AI examination for signal category: ${signal}.`,
      `[${new Date().toLocaleTimeString()}] Sending synthesis task request to HIL sandbox.`
    ]);

    try {
      const conditionParam = activePatientName 
        ? (MOCK_PATIENTS.find(p => p.name === activePatientName)?.condition ?? "Normal")
        : "Normal";

      const res = await fetch(`http://localhost:8000/api/v1/personas/generate?condition=${conditionParam}&complexity=3`, { method: "POST" });
      const persona = await res.json();
      applyPersona(persona);
      
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Persona parameters compiled successfully. ID: ${persona.persona_id}`
      ]);

      await fetch("http://localhost:8000/api/v1/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal_type: signal, persona_params: persona, duration_s: 30, sample_rate: 50 }),
      });

      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Signal generator active. Synthesis stream established.`
      ]);
    } catch (err) { 
      console.error(err); 
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: Synthesis server handshake failed.`]);
    }
  };

  const handlePatientSelect = (patient: ClinicalPatient) => {
    setActivePatientName(patient.name);
    
    // Mock apply persona payload
    applyPersona({
      persona_id: patient.id,
      display_name: patient.name,
      age: patient.age,
      sex: patient.gender === "Female" ? "F" : "M",
      hr_bpm: patient.condition === "Atrial Fibrillation" ? 135 : patient.condition === "Bradycardia" ? 42 : patient.condition === "STEMI" ? 110 : 72,
      hr_min: 50,
      hr_max: 150,
      conditions: [patient.condition],
      noise_level: 0.05,
      arrhythmia_type: patient.condition === "Atrial Fibrillation" ? "AF" : null,
      weight_kg: patient.weight
    });

    setExamining(true);
    setActiveSection(1);
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Selected patient ${patient.name} (${patient.id}). Entering examination sandbox.`
    ]);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (loginTab === "patient") {
      if (patId.trim() === "") {
        setLoginError("Please enter a valid Patient ID.");
        return;
      }
      // Simple mock authentication
      setAuthRole("patient");
      setAuthName(patId);
      
      // Auto-examine patient
      applyPersona({
        persona_id: patId,
        display_name: "John Doe",
        age: 35,
        sex: "M",
        hr_bpm: 75,
        hr_min: 55,
        hr_max: 130,
        conditions: ["Normal"],
        noise_level: 0.02,
        arrhythmia_type: null
      });
      setExamining(true); // Patients go directly to the Examination Page
    } else {
      if (docId.trim() === "" || docPass !== "admin") {
        setLoginError("Invalid Doctor Credentials. Use Passcode: admin");
        return;
      }
      setAuthRole("doctor");
      setAuthName(`Dr. ${docId.replace("DR-", "")}`);
      setExamining(false); // Doctors go to the Command Center first
    }
  };

  const handleLogout = () => {
    setAuthRole(null);
    setAuthName("");
    setExamining(false);
    setActivePatientName(null);
  };

  const toggleSensorMode = () => {
    const next: SensorMode =
      sensorMode === "NORMAL_MODE" ? "SIMULATION_MODE" :
      sensorMode === "SIMULATION_MODE" ? "REAL_SENSOR_MODE" : "NORMAL_MODE";
    setSensorMode(next);
    setLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Swapped telemetry mode to: ${next}`
    ]);
  };

  const SECTIONS = [
    { id: 1 as const, label: "Sensor Data" },
    { id: 2 as const, label: "Digital Twin Sandbox" },
    { id: 3 as const, label: "Twin Analytics" },
    { id: 4 as const, label: "Scenario Comparison" },
  ];

  // ── Render Login Screen ─────────────────────────────────────────────────────
  if (authRole === null) {
    return (
      <ErrorBoundary>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
          {/* Floating gradient orbs */}
          <div style={{ position: "fixed", top: "-10%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.13) 0%, transparent 70%)", filter: "blur(60px)", animation: "float 14s ease-in-out infinite", pointerEvents: "none" }} />
          <div style={{ position: "fixed", bottom: "-8%", right: "-5%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)", filter: "blur(60px)", animation: "float 16s ease-in-out infinite 2s", pointerEvents: "none" }} />
          <div style={{ position: "fixed", top: "40%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)", filter: "blur(60px)", animation: "float 18s ease-in-out infinite 4s", pointerEvents: "none" }} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-6xl w-full" style={{ position: "relative", zIndex: 2 }}>
            
            {/* Left Column: Info Branding */}
            <div className="lg:col-span-7 flex flex-col justify-center gap-7 p-4">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "var(--gradient-cyan)", boxShadow: "0 4px 20px rgba(236,72,153,0.30)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontStyle: "italic", fontSize: 20, color: "white",
                }}>BT</div>
                <div>
                  <h1 style={{ fontSize: 30, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", fontStyle: "italic", margin: 0, color: "var(--text-primary)" }}>
                    BioTwin <span className="gradient-text">Master Suite</span>
                  </h1>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginTop: 2 }}>Digital Twin · Hardware-in-the-Loop · AI Analytics</p>
                </div>
              </div>

              <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 540 }}>
                A premium, clinical-grade digital twin simulation and hardware-in-the-loop validation platform. Enable real-time telemetry testing, disease projection, and multi-agent persona analytics.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                {[
                  { icon: "🫀", title: "Biosignal Telemetry", desc: "Real-time SpO₂, heart rate, stress & temperature monitoring from hardware sensors.", color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
                  { icon: "🧬", title: "AI Condition Engine", desc: "Automatic classification of cardiac conditions with clinical-grade accuracy.", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)" },
                  { icon: "🩺", title: "Disease Forecasting", desc: "24-hour physiology predictions across 6 intervention scenarios.", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
                  { icon: "📊", title: "FDA-Grade Reports", desc: "Exportable diagnostic logs, risk timelines, and compliance reviews.", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
                ].map((f) => (
                  <div key={f.title} className="feature-card" style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 800, color: f.color, margin: 0 }}>{f.title}</h4>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Portal Login Card */}
            <div className="lg:col-span-5 flex items-center">
              <div className="glass-card w-full p-8 flex flex-col gap-6" style={{ boxShadow: "0 12px 48px rgba(236,72,153,0.12), 0 2px 8px rgba(0,0,0,0.04)" }}>
                
                {/* Tabs */}
                <div style={{ display: "flex", background: "rgba(236,72,153,0.05)", padding: 5, borderRadius: 14, gap: 4 }}>
                  <button
                    onClick={() => { setLoginTab("patient"); setLoginError(""); }}
                    style={{
                      flex: 1, padding: "12px 0", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em",
                      borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: "none",
                      background: loginTab === "patient" ? "white" : "transparent",
                      color: loginTab === "patient" ? "#ec4899" : "var(--text-muted)",
                      boxShadow: loginTab === "patient" ? "0 2px 12px rgba(236,72,153,0.15)" : "none",
                    }}
                  >
                    🩷 Patient Portal
                  </button>
                  <button
                    onClick={() => { setLoginTab("doctor"); setLoginError(""); }}
                    style={{
                      flex: 1, padding: "12px 0", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em",
                      borderRadius: 10, cursor: "pointer", transition: "all 0.2s", border: "none",
                      background: loginTab === "doctor" ? "white" : "transparent",
                      color: loginTab === "doctor" ? "#0ea5e9" : "var(--text-muted)",
                      boxShadow: loginTab === "doctor" ? "0 2px 12px rgba(14,165,233,0.15)" : "none",
                    }}
                  >
                    🩵 Doctor Portal
                  </button>
                </div>

                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-primary)", margin: 0 }}>
                    {loginTab === "patient" ? "Patient Access Gateway" : "Clinician Verification"}
                  </h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    {loginTab === "patient" ? "Monitor your real-time physiological digital twin" : "Manage active patient simulator diagnostics"}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {loginTab === "patient" ? (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)" }}>Patient Identification Code</label>
                        <input
                          type="text" value={patId} onChange={(e) => setPatId(e.target.value)}
                          style={{ padding: "13px 16px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(236,72,153,0.18)", borderRadius: 12, fontSize: 14, fontFamily: "monospace", color: "var(--text-primary)", transition: "all 0.2s" }}
                          placeholder="e.g. PT-7049"
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)" }}>Security Access PIN</label>
                        <input
                          type="password" value={patPin} onChange={(e) => setPatPin(e.target.value)}
                          style={{ padding: "13px 16px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(236,72,153,0.18)", borderRadius: 12, fontSize: 14, color: "var(--text-primary)", transition: "all 0.2s" }}
                          placeholder="••••"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)" }}>Clinician Register ID</label>
                        <input
                          type="text" value={docId} onChange={(e) => setDocId(e.target.value)}
                          style={{ padding: "13px 16px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(14,165,233,0.18)", borderRadius: 12, fontSize: 14, fontFamily: "monospace", color: "var(--text-primary)", transition: "all 0.2s" }}
                          placeholder="e.g. DR-9022"
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)" }}>Department Specialty</label>
                        <select
                          value={doctorDept} onChange={(e) => setDoctorDept(e.target.value)}
                          style={{ padding: "13px 16px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(14,165,233,0.18)", borderRadius: 12, fontSize: 14, color: "var(--text-primary)", transition: "all 0.2s" }}
                        >
                          <option value="Cardiology">Cardiology Department</option>
                          <option value="Pulmonology">Pulmonology Department</option>
                          <option value="Neurology">Neurology Department</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-muted)" }}>Security Passcode (Use: admin)</label>
                        <input
                          type="password" value={docPass} onChange={(e) => setDocPass(e.target.value)}
                          style={{ padding: "13px 16px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(14,165,233,0.18)", borderRadius: 12, fontSize: 14, color: "var(--text-primary)", transition: "all 0.2s" }}
                          placeholder="••••"
                        />
                      </div>
                    </>
                  )}

                  {loginError && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", background: "rgba(239,68,68,0.06)", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.15)" }}>
                      ⚠️ {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 14, fontWeight: 800, fontSize: 13,
                      textTransform: "uppercase", letterSpacing: "0.12em", cursor: "pointer", border: "none",
                      color: "white", transition: "all 0.2s",
                      background: loginTab === "patient" ? "linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #0ea5e9 100%)" : "linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #8b5cf6 100%)",
                      boxShadow: loginTab === "patient" ? "0 6px 24px rgba(236,72,153,0.30)" : "0 6px 24px rgba(14,165,233,0.30)",
                    }}
                  >
                    {loginTab === "patient" ? "🔐 Authenticate & Examine Twin" : "🔬 Verify Doctor Security Portal"}
                  </button>
                </form>

                {/* Footer trust badges */}
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
                  {["HIPAA", "FDA 510(k)", "ISO 13485"].map(b => (
                    <span key={b} style={{ fontSize: 8, fontWeight: 800, color: "var(--text-muted)", background: "rgba(0,0,0,0.03)", padding: "4px 10px", borderRadius: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>{b}</span>
                  ))}
                </div>

              </div>
            </div>

          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // ── Main Layout ─────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Nav ── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(236,72,153,0.12)",
          background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)",
          flexShrink: 0,
          boxShadow: "0 2px 16px rgba(236,72,153,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: "var(--gradient-cyan)", boxShadow: "0 3px 14px rgba(236,72,153,0.32)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontStyle: "italic", fontSize: 13, color: "white"
            }}>BT</div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em", fontStyle: "italic", margin: 0, color: "var(--text-primary)" }}>
                BioTwin <span className="gradient-text">Master Suite</span>
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#22c55e" : "#ef4444", display: "inline-block", boxShadow: connected ? "0 0 6px rgba(34,197,94,0.6)" : "0 0 6px rgba(239,68,68,0.6)" }} />
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--text-muted)" }}>
                  {connected ? "HIL Link Active" : "Offline"}
                </span>
                <span style={{ color: "rgba(236,72,153,0.25)", fontSize: 12 }}>|</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 9px", borderRadius: 9999, background: authRole === "doctor" ? "rgba(14,165,233,0.10)" : "rgba(236,72,153,0.10)", color: authRole === "doctor" ? "#0284c7" : "#db2777", border: `1px solid ${authRole === "doctor" ? "rgba(14,165,233,0.22)" : "rgba(236,72,153,0.22)"}` }}>
                  {authRole === "doctor" ? `🩵 ${authName}` : `🩷 ${authName}`}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {examining && (
              <button onClick={toggleSensorMode} style={{
                padding: "7px 16px", borderRadius: 10, fontSize: 9, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
                border: `1px solid ${
                  sensorMode === "REAL_SENSOR_MODE" ? "rgba(34,197,94,0.30)" :
                  sensorMode === "NORMAL_MODE" ? "rgba(168,85,247,0.30)" :
                  "rgba(14,165,233,0.30)"
                }`,
                background: sensorMode === "REAL_SENSOR_MODE" ? "rgba(34,197,94,0.08)" :
                  sensorMode === "NORMAL_MODE" ? "rgba(168,85,247,0.08)" :
                  "rgba(14,165,233,0.08)",
                color: sensorMode === "REAL_SENSOR_MODE" ? "#16a34a" :
                  sensorMode === "NORMAL_MODE" ? "#a855f7" : "#0284c7",
              }}>
                {sensorMode === "REAL_SENSOR_MODE" ? "🟢 Real Sensor" :
                 sensorMode === "NORMAL_MODE" ? "🟣 Normal" : "🔵 Simulation"}
              </button>
            )}
            
            {examining && (["overview", "report"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: "7px 18px", borderRadius: 10, fontSize: 9, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
                border: `1px solid ${activeTab === t ? "rgba(236,72,153,0.28)" : "rgba(0,0,0,0.06)"}`,
                background: activeTab === t ? "rgba(236,72,153,0.08)" : "rgba(255,255,255,0.8)",
                color: activeTab === t ? "#db2777" : "var(--text-muted)",
                boxShadow: activeTab === t ? "0 2px 10px rgba(236,72,153,0.12)" : "none",
              }}>
                {t === "overview" ? "📊 Sim Monitor" : "📋 FDA Report"}
              </button>
            ))}

            <button
              onClick={handleLogout}
              style={{
                padding: "7px 16px", borderRadius: 10, fontSize: 9, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
                background: "rgba(255,255,255,0.9)", border: "1px solid rgba(236,72,153,0.16)",
                color: "var(--text-muted)",
              }}
            >
              Logout ⎋
            </button>
          </div>
        </nav>

        {/* ── Body ── */}
        {!examining ? (
          /* Doctor View - Command Center */
          <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 28 }}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1px solid rgba(236,72,153,0.12)", paddingBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.3em", color: "#0ea5e9", marginBottom: 6 }}>🏥 Doctor Portal</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, color: "var(--text-primary)" }}>
                  Clinician <span className="gradient-text">Command Center</span>
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Active virtual patient digital twins registry · Hardware-in-the-loop diagnostic control
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Active Patients", value: MOCK_PATIENTS.length, color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
                  { label: "Critical", value: MOCK_PATIENTS.filter(p => p.status.includes("Critical")).length, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
                  { label: "Monitoring", value: MOCK_PATIENTS.filter(p => !p.status.includes("Critical")).length, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: "center", padding: "12px 20px", borderRadius: 14, background: stat.bg, border: `1px solid ${stat.color}22` }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: stat.color, fontFamily: "monospace" }}>{stat.value}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Patient Table (col-span-8) */}
              <div className="xl:col-span-8 flex flex-col gap-4">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-muted)", margin: 0 }}>🛏️ Virtual Ward Directory</h3>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 10px", borderRadius: 9999, background: "rgba(14,165,233,0.10)", color: "#0284c7", border: "1px solid rgba(14,165,233,0.20)" }}>Live Registry</span>
                </div>
                
                <div className="glass-card overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(236,72,153,0.08)" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient ID</th>
                        <th>Name</th>
                        <th>Age / Gender</th>
                        <th>Condition</th>
                        <th>Status</th>
                        <th>Live Vitals</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_PATIENTS.map((p) => {
                        const condColor = p.condition === "Normal" ? { c: "#16a34a", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.22)" }
                          : p.condition === "STEMI" ? { c: "#dc2626", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.22)" }
                          : { c: "#db2777", bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.22)" };
                        return (
                          <tr key={p.id}>
                            <td style={{ fontFamily: "monospace", fontWeight: 800, color: "#0284c7" }}>{p.id}</td>
                            <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</td>
                            <td style={{ color: "var(--text-muted)" }}>{p.age} / {p.gender}</td>
                            <td>
                              <span className="badge" style={{ background: condColor.bg, color: condColor.c, border: `1px solid ${condColor.border}` }}>
                                {p.condition}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: p.status.includes("Critical") ? "#dc2626" : p.status.includes("Alert") ? "#db2777" : "#16a34a" }}>
                              {p.status.includes("Critical") ? "🔴" : p.status.includes("Alert") ? "🟡" : "🟢"} {p.status}
                            </td>
                            <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#0284c7", fontSize: 12 }}>{p.vitalSignSummary}</td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => handlePatientSelect(p)}
                                style={{
                                  padding: "7px 14px", borderRadius: 10, fontSize: 9, fontWeight: 800,
                                  textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", border: "none",
                                  background: "linear-gradient(135deg, #f472b6 0%, #0ea5e9 100%)",
                                  color: "white", boxShadow: "0 3px 12px rgba(236,72,153,0.28)",
                                }}
                              >
                                🔬 Run HIL
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Logs & Diagnostics (col-span-4) */}
              <div className="xl:col-span-4 flex flex-col gap-5">
                
                {/* Console */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-muted)", margin: 0 }}>⚡ Telemetry System Logs</h3>
                  <div
                    style={{ borderRadius: 16, padding: "16px 18px", fontFamily: "monospace", fontSize: 11, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 4,
                      background: "linear-gradient(145deg, #0f172a, #1e1b4b)", color: "#38bdf8",
                      minHeight: 180, maxHeight: 240, overflowY: "auto",
                      border: "1px solid rgba(14,165,233,0.15)",
                      boxShadow: "inset 0 2px 12px rgba(0,0,0,0.2), 0 4px 20px rgba(14,165,233,0.08)" }}
                  >
                    {logs.map((log, index) => (
                      <div key={index} style={{ opacity: 0.85 + index * 0.01 }}>{log}</div>
                    ))}
                  </div>
                </div>

                {/* Device Diagnostics */}
                <div className="glass-card p-5 flex flex-col gap-4" style={{ boxShadow: "0 4px 20px rgba(14,165,233,0.08)" }}>
                  <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-muted)", borderBottom: "1px solid rgba(236,72,153,0.10)", paddingBottom: 10, margin: 0 }}>🖥️ Device Telemetry</h3>
                  
                  {[
                    { label: "Sensor Mode", value: sensorMode, color: "#0284c7" },
                    { label: "Connection", value: connected ? "ACTIVE · 115200 BAUD" : "DISCONNECTED", color: connected ? "#16a34a" : "#dc2626" },
                    { label: "Buffer Status", value: "100% OK · 0 PACKET LOSS", color: "#16a34a" },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: row.color, fontFamily: "monospace" }}>{row.value}</span>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          </div>
        ) : (
          /* Examining View - AI Examination Room */
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* ═══ SIDEBAR NAV ═══ */}
            <div style={{
              width: 210, flexShrink: 0,
              borderRight: "1px solid rgba(236,72,153,0.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(252,231,243,0.4) 100%)",
              display: "flex", flexDirection: "column",
              paddingTop: 20, overflowY: "auto",
              boxShadow: "2px 0 16px rgba(236,72,153,0.05)",
            }}>
              <div style={{ fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.28em", color: "var(--text-muted)", padding: "0 18px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--gradient-pink)", display: "inline-block", flexShrink: 0 }} />
                Simulation Suite
              </div>
              {SECTIONS.map((s, i) => {
                const icons = ["🫀", "🧬", "📊", "🔬"];
                const colors = ["#ec4899", "#0ea5e9", "#22c55e", "#8b5cf6"];
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "11px 18px",
                      display: "flex", alignItems: "center", gap: 10,
                      background: activeSection === s.id
                        ? `linear-gradient(90deg, ${colors[i]}14 0%, transparent 100%)`
                        : "transparent",
                      borderTop: "none", borderRight: "none", borderBottom: "none",
                      borderLeft: `3px solid ${activeSection === s.id ? colors[i] : "transparent"}`,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{icons[i]}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: activeSection === s.id ? colors[i] : "var(--text-muted)",
                    }}>
                      {s.label}
                    </span>
                  </button>
                );
              })}

              {authRole === "doctor" && (
                <div style={{ marginTop: "auto", padding: 14 }}>
                  <button
                    onClick={() => { setExamining(false); setActivePatientName(null); }}
                    style={{
                      width: "100%", padding: "9px 14px", borderRadius: 12, fontSize: 9, fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
                      background: "rgba(255,255,255,0.9)", border: "1px solid rgba(236,72,153,0.18)",
                      color: "var(--text-muted)",
                    }}
                  >
                    ← Exit Examination
                  </button>
                </div>
              )}
            </div>

            {/* ═══ MAIN PANEL ═══ */}
            <div style={{ flex: 1, overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 28,
              background: "linear-gradient(135deg, rgba(252,231,243,0.15) 0%, rgba(239,246,255,0.15) 50%, rgba(240,253,244,0.15) 100%)" }}>
              
              {activePatientName && (
                <div className="glass-card p-4 flex items-center justify-between border-l-4" style={{ borderLeftColor: "var(--accent-pink)", background: "rgba(236,72,153,0.02)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🧑‍⚕️</span>
                    <div>
                      <span className="text-xs text-text-muted">Active Simulated Patient:</span>
                      <h3 className="text-base font-bold text-text-primary leading-tight">{activePatientName} ({twinState.condition} - Age {twinState.age})</h3>
                    </div>
                  </div>
                  <span className="badge badge-running">Active Session</span>
                </div>
              )}

              {/* ── Section 1: Sensor Data ── */}
              {activeSection === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <SectionHeader label="Sensor Data" sub="Live hardware telemetry · 3D anatomy · AI insights" />

                  {/* Top row: 3D Model + AI Insights */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "stretch" }}>

                    {/* Sketchfab 3D model */}
                    <div className="glass-card overflow-hidden" style={{ minHeight: 420, borderRadius: 20, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.25em", color: "var(--text-muted)", padding: "14px 18px 0", marginBottom: 8 }}>
                        🫁 Muscular Anatomy · 3D Reference Model
                      </div>
                      <iframe
                        title="Muscular Male Anatomy 3D"
                        src="https://sketchfab.com/models/dbaef4ef1d3641f68eec4540ca50e18b/embed?autostart=1&ui_theme=light&ui_controls=0&ui_infos=0&ui_watermark=0"
                        style={{ width: "100%", height: 380, border: "none" }}
                        allow="autoplay; fullscreen; xr-spatial-tracking"
                        allowFullScreen
                      />
                    </div>

                    {/* AI Insights */}
                    <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border-color)", borderRadius: 20, minHeight: 420, display: "flex", flexDirection: "column" }}>
                      <AIInsights />
                    </div>
                  </div>

                  {/* Sensor vitals below */}
                  <VitalsMonitor twinState={twinState} sensorMode={sensorMode} />

                  {/* Gate to compilation control room if not started */}
                  {twinState.patientId === "default-patient" && (
                    <div style={{ maxWidth: 900, width: "100%", margin: "0 auto" }}>
                      <ExaminationControl onStart={startExamination} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Section 2: Digital Twin Sandbox ── */}
              {activeSection === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <SectionHeader label="Digital Twin Sandbox" sub="Intervention experimentation · AI persona · cardiac simulation · clinical insights" />

                  {/* Heart 3D model + Persona Generator */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "stretch" }}>
                    {/* Sketchfab animated heart */}
                    <div className="glass-card overflow-hidden" style={{ minHeight: 420, borderRadius: 20, border: "1px solid var(--border-color)" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.25em", color: "var(--text-muted)", padding: "14px 18px 0", marginBottom: 8 }}>
                        🫀 Animated Human Heart · 3D Reference Model
                      </div>
                      <iframe
                        title="Animated Human Heart 3D"
                        src="https://sketchfab.com/models/775d6629622740de8a5ed61a959c7506/embed?autostart=1&ui_theme=light&ui_controls=0&ui_infos=0&ui_watermark=0"
                        style={{ width: "100%", height: 380, border: "none" }}
                        allow="autoplay; fullscreen; xr-spatial-tracking"
                        allowFullScreen
                      />
                    </div>

                    {/* Persona Generator */}
                    <div className="glass-card" style={{ padding: "20px 24px", border: "1px solid var(--border-color)", borderRadius: 20, minHeight: 420, display: "flex", flexDirection: "column" }}>
                      <PersonaGenerator onPersonaApplied={applyPersona} onRemovePersona={removePersona} isPersonaApplied={isPersonaApplied} twinState={twinState} />
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: "24px 28px", border: "1px solid var(--border-color)" }}>
                    <TwinSandbox
                      twinState={twinState}
                      scenario={scenario} setScenario={setScenario}
                      timeline={timeline} setTimeline={setTimeline}
                      prediction={prediction}
                    />
                  </div>
                </div>
              )}

              {/* ── Section 3: Twin Analytics ── */}
              {activeSection === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <SectionHeader label="Digital Twin Analytics" sub="Physiology timeline, disease progression, risk trajectory & health radar" />
                  <TwinAnalyticsCore twinState={twinState} scenario={scenario} prediction={prediction} packets={packets} />
                </div>
              )}

              {/* ── Section 4: Scenario Comparison ── */}
              {activeSection === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <SectionHeader label="Scenario Comparison" sub="What-if analysis — compare all interventions at 1-hour projection" />
                  <TwinScenarioComparator twinState={twinState} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* FDA Report overlay */}
        {activeTab === "report" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(255, 255, 255, 0.97)", backdropFilter: "blur(16px)", padding: 48, overflowY: "auto" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
              <button onClick={() => setActiveTab("overview")} style={{ marginBottom: 32, color: "var(--accent-pink)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", background: "none", border: "none", cursor: "pointer" }}>
                ← Back to Suite
              </button>
              <ReportViewer reportId="exam-101" />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0, color: "var(--text-primary)" }}>
        {label}
      </h2>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, letterSpacing: "0.06em" }}>{sub}</p>
    </div>
  );
}
