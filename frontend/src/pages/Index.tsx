import { Brain, Search, FileText, Users, HardDrive, Zap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  { icon: Brain, title: "Add Memory", description: "Store text, PDFs, images, and documents", to: "/add-memory", color: "text-primary" },
  { icon: Search, title: "Smart Search", description: "Semantic search across all your memories", to: "/search", color: "text-primary" },
  { icon: Users, title: "Face Memory", description: "Detect and label faces in images", to: "/face-memory", color: "text-primary" },
  { icon: FileText, title: "File Manager", description: "Browse and manage all documents", to: "/file-manager", color: "text-primary" },
];
const stats = [
  { icon: HardDrive, label: "Local Storage", value: "100% Private" },
  { icon: Zap, label: "AI Powered", value: "FAISS + Transformers" },
];

const Dashboard = () => (
  <div className="p-8 max-w-5xl mx-auto">
    <PageHeader title="Dashboard" description="Your personal AI knowledge brain — fully local, fully private." />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-panel rounded-xl p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><stat.icon className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p><p className="text-sm font-semibold text-foreground">{stat.value}</p></div>
        </motion.div>
      ))}
    </div>
    <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {features.map((feature, i) => (
        <motion.div key={feature.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
          <Link to={feature.to} className="block glass-panel rounded-xl p-5 hover-lift group">
            <feature.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-foreground text-sm mb-1">{feature.title}</h3>
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
);

export default Dashboard;