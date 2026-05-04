"use client";
import React, { useState, useEffect } from "react";

export default function ReportViewer({ reportId }: { reportId: string }) {
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);

  const MOCK_REPORT = `## FDA Validation Report — Twin ${reportId}

### Executive Summary
The firmware under test **failed to detect an irregular heartbeat** characteristic of Atrial Fibrillation (AF) for virtual patient persona \`${reportId}\`. The R-R interval variance was within detectable threshold (CV > 0.15), but the firmware alarm did not trigger within the 10-second detection window.

### Signal Analysis
- **Signal Type:** ECG Lead II
- **Duration:** 10.0 seconds at 250 Hz (2,500 samples)
- **Heart Rate:** 142 bpm (irregularly irregular)
- **R-R Interval CV:** 0.23 (threshold: 0.15)
- **P-Wave Presence:** Absent (consistent with AF)
- **QRS Duration:** 98 ms (normal)

### Root Cause Analysis
The firmware's beat detection algorithm uses a fixed threshold of 0.7 mV for R-peak detection. At elevated heart rates (>130 bpm), the signal amplitude decreases due to reduced ventricular filling time, causing peaks to fall below the detection threshold.

### Recommendation
1. Implement adaptive thresholding based on running average of signal amplitude
2. Add frequency-domain analysis (FFT) to complement time-domain detection
3. Consider reducing the detection window from 10s to 5s for tachycardic rhythms

### Compliance Status
⚠️ **IEC 62304 Class C** — This failure mode could result in missed diagnosis of a life-threatening arrhythmia. Corrective action required before submission.`;

  useEffect(() => {
    let idx = 0;
    setStreamedText("");
    setIsStreaming(true);
    const interval = setInterval(() => {
      if (idx < MOCK_REPORT.length) {
        const chunkSize = Math.floor(Math.random() * 4) + 2;
        setStreamedText(MOCK_REPORT.slice(0, idx + chunkSize));
        idx += chunkSize;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [reportId]);

  // Simple markdown-to-jsx renderer
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h2
            key={i}
            className="text-xl font-bold mb-3 mt-4"
            style={{ color: "var(--accent-cyan)" }}
          >
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3
            key={i}
            className="text-base font-semibold mb-2 mt-4"
            style={{ color: "var(--text-primary)" }}
          >
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("- ")) {
        const content = line.replace("- ", "");
        return (
          <div key={i} className="flex gap-2 mb-1 ml-2">
            <span style={{ color: "var(--accent-cyan)" }}>•</span>
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
              dangerouslySetInnerHTML={{
                __html: content
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
                  .replace(/`(.*?)`/g, '<code style="color:var(--accent-purple);background:rgba(139,92,246,0.1);padding:1px 6px;border-radius:4px;font-size:0.8rem">$1</code>'),
              }}
            />
          </div>
        );
      }
      if (line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.")) {
        const num = line.match(/^(\d+)\./)?.[1];
        const content = line.replace(/^\d+\.\s*/, "");
        return (
          <div key={i} className="flex gap-2 mb-1 ml-2">
            <span
              className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: "rgba(6,182,212,0.15)",
                color: "var(--accent-cyan)",
              }}
            >
              {num}
            </span>
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {content}
            </span>
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return (
        <p
          key={i}
          className="text-sm mb-1"
          style={{ color: "var(--text-secondary)" }}
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
              .replace(/`(.*?)`/g, '<code style="color:var(--accent-purple);background:rgba(139,92,246,0.1);padding:1px 6px;border-radius:4px;font-size:0.8rem">$1</code>'),
          }}
        />
      );
    });
  };

  return (
    <div className="glass-card p-6 animate-in" style={{ animationDelay: "0.4s" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            FDA Validation Report
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            AI-generated analysis • DeepSeek-R1 / Gemini
          </p>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-2">
            <div className="spinner" />
            <span className="text-xs" style={{ color: "var(--accent-cyan)" }}>
              Streaming...
            </span>
          </div>
        )}
      </div>
      <div
        className="chart-container font-mono text-sm overflow-y-auto"
        style={{ maxHeight: 400, lineHeight: 1.7 }}
      >
        {renderMarkdown(streamedText)}
        {isStreaming && (
          <span
            className="inline-block w-2 h-4 ml-0.5"
            style={{
              background: "var(--accent-cyan)",
              animation: "pulse-ring 1s infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}
