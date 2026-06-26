import { History, Home, ListPlus, Settings, Target } from "lucide-react";

export const navigationItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "记录", href: "/records", icon: ListPlus },
  { label: "历史", href: "/history", icon: History },
  { label: "目标", href: "/goals", icon: Target },
  { label: "设置", href: "/settings", icon: Settings },
] as const;
