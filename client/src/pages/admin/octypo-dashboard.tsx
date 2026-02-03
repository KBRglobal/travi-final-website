import { useEffect } from "react";
import { useLocation } from "wouter";

export default function OctypoDashboard() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/admin/octypo/dashboard");
  }, [setLocation]);

  return null;
}
