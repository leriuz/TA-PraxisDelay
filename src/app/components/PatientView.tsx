import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, Provider, DelayStatus, Practice, formatRelativeTime } from "@/lib/supabase";

export default function PatientView() {
  const { practiceId } = useParams<{ practiceId: string }>();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [delays, setDelays] = useState<DelayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!practiceId) return;
  loadData();

  const interval = setInterval(() => {
    loadData();
  }, 30000); // alle 30 Sekunden

  return () => clearInterval(interval);
}, [practiceId]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [practiceRes, providersRes, delaysRes] = await Promise.all([
      supabase.from("practices").select("*").eq("id", practiceId).single(),
      supabase.from("providers").select("*").eq("practice_id", practiceId).eq("is_active", true),
      supabase.from("delay_status").select("*").eq("practice_id", practiceId),
    ]);

    if (practiceRes.error || !practiceRes.data) {
      setError("Praxis nicht gefunden.");
      setLoading(false);
      return;
    }

    setPractice(practiceRes.data);
    setProviders(providersRes.data ?? []);
    setDelays(delaysRes.data ?? []);
    setLoading(false);
  }

  function getDelay(providerId: string): DelayStatus | null {
    return delays.find((d) => d.provider_id === providerId) ?? null;
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Wird geladen...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{practice?.name}</h1>
      <p className="text-gray-500 text-sm mb-6">{practice?.city}</p>

      <div className="space-y-3">
        {providers.map((provider) => {
          const delay = getDelay(provider.id);
          const minutes = delay?.delay_minutes ?? 0;
          return (
            <div key={provider.id} className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{provider.name}</p>
                {provider.specialty && <p className="text-sm text-gray-400">{provider.specialty}</p>}
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${minutes === 0 ? "text-green-600" : minutes <= 15 ? "text-yellow-500" : "text-red-500"}`}>
                  {minutes === 0 ? "✓" : `+${minutes}`}
                </p>
                <p className="text-xs text-gray-400">
                  {minutes === 0 ? "pünktlich" : "Min Verspätung"}
                </p>
                {delay && <p className="text-xs text-gray-300">{formatRelativeTime(delay.updated_at)}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-300 mt-8">Aktualisiert durch das Praxisteam</p>
    </div>
  );
}