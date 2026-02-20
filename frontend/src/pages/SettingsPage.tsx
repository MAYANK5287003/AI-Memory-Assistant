import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { motion } from "framer-motion";

const SettingsPage = () => {

  // ⭐ STATE
  const [darkMode, setDarkMode] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [gallerySize, setGallerySize] = useState("medium");
  const [zoomMode, setZoomMode] = useState("contain");

  // ⭐ LOAD SETTINGS
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);

    setAnimations(localStorage.getItem("animations") !== "false");
    setGallerySize(localStorage.getItem("gallery_size") || "medium");
    setZoomMode(localStorage.getItem("zoom_mode") || "contain");
  }, []);

  // ⭐ THEME TOGGLE
  const toggleTheme = (dark: boolean) => {
    setDarkMode(dark);
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Settings" description="Customize your AI Memory Assistant experience." />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >

        {/* 🌙 THEME */}
        <div className="glass-panel rounded-xl p-5 flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Theme Mode</Label>
            <p className="text-xs text-muted-foreground">Switch between dark and light theme</p>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleTheme} />
        </div>

        {/* 🧱 GALLERY SIZE */}
        <div className="glass-panel rounded-xl p-5 space-y-3">
          <Label className="text-sm font-semibold">Gallery Size</Label>
          <div className="flex gap-2">
            {["small", "medium", "large"].map(size => (
              <Button
                key={size}
                variant={gallerySize === size ? "default" : "outline"}
                onClick={() => {
                  setGallerySize(size);
                  localStorage.setItem("gallery_size", size);
                }}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        {/* ✨ ANIMATIONS */}
        <div className="glass-panel rounded-xl p-5 flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Animations</Label>
            <p className="text-xs text-muted-foreground">Enable smooth UI animations</p>
          </div>
          <Switch
            checked={animations}
            onCheckedChange={(v) => {
              setAnimations(v);
              localStorage.setItem("animations", String(v));
            }}
          />
        </div>

        {/* 🔎 ZOOM MODE */}
        <div className="glass-panel rounded-xl p-5 space-y-3">
          <Label className="text-sm font-semibold">Image Zoom Mode</Label>
          <div className="flex gap-2">
            {["contain", "cover"].map(mode => (
              <Button
                key={mode}
                variant={zoomMode === mode ? "default" : "outline"}
                onClick={() => {
                  setZoomMode(mode);
                  localStorage.setItem("zoom_mode", mode);
                }}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>

        {/* ℹ ABOUT */}
        <div className="glass-panel rounded-xl p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">About</h3>
            <p className="text-xs text-muted-foreground mt-1">
              AI Memory Assistant — Your Personal Knowledge Brain.
              Fully local and private. Powered by FastAPI, SQLite,
              FAISS, Sentence Transformers, and OCR.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Version 1.0.0
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default SettingsPage;