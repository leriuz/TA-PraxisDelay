import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/app/components/LoginForm";
import { DelayDashboard } from "@/app/components/DelayDashboard";
import { SetupRequired } from "@/app/components/SetupRequired";

function AppContent() {
  const { user, profile, practice, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">
          Wird geladen...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  // User is logged in but has no practice set up
  if (user && profile && !practice) {
    return <SetupRequired profile={profile} />;
  }

  return <DelayDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}