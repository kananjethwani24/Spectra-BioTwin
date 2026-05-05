"use client";
import React from "react";

export default function InteractiveHeart3D() {
  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Iframe - heavily oversized to push ALL branding out */}
      <div className="absolute inset-[-40px] overflow-hidden">
        <iframe
          title="Anatomical Human Heart"
          src="https://sketchfab.com/models/a3f0ea2030214a6bbaa97e7357eebd58/embed?autostart=1&preload=1&transparent=0&ui_theme=dark&ui_infos=0&ui_watermark_link=0&ui_watermark=0&ui_help=0&ui_settings=0&ui_inspector=0&ui_annotations=0&ui_stop=0&ui_vr=0&ui_fullscreen=0&ui_ar=0&ui_loading=0&ui_color=000000&annotations_visible=0&annotation=0&dnt=1"
          className="w-[calc(100%+80px)] h-[calc(100%+80px)] border-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
        />
      </div>

      {/* MASK: Bottom - thick solid black to fully hide "Hannah Newey" + Sketchfab logo */}
      <div className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(to top, black 70%, transparent)' }} />

      {/* MASK: Top - thick solid black to hide top branding/text */}
      <div className="absolute top-0 left-0 right-0 h-20 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, black 60%, transparent)' }} />

      {/* MASK: Right edge */}
      <div className="absolute top-0 right-0 bottom-0 w-16 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(to left, black 50%, transparent)' }} />

      {/* MASK: Left edge */}
      <div className="absolute top-0 left-0 bottom-0 w-10 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(to right, black 40%, transparent)' }} />
    </div>
  );
}
