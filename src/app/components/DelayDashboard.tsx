import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, formatRelativeTime } from '@/lib/supabase';
import type { Provider, DelayStatus } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { AlertCircle, LogOut, Minus, Plus, Printer, Settings } from 'lucide-react';
import { ConnectionStatus } from '@/app/components/ConnectionStatus';
import { HelpDialog } from '@/app/components/HelpDialog';
import { PracticeSettings } from '@/app/components/PracticeSettings';
import { QRCodeSVG } from 'qrcode.react';

interface ProviderWithDelay extends Provider {
  delay_minutes: number | null;
  delay_updated_at: string | null;
}

type ViewMode = 'per-provider' | 'practice-wide' | 'settings';

export function DelayDashboard() {
  const { user, practice, signOut } = useAuth();
  const [providers, setProviders] = useState<ProviderWithDelay[]>([]);
  const [practiceWideDelay, setPracticeWideDelay] = useState<DelayStatus | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('per-provider');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const needsSetup = practice && (
    practice.name === 'Neue Praxis' ||
    practice.name === 'Neue Praxis 1' ||
    practice.name === 'Neue Praxis 2' ||
    practice.name === 'Ihre Praxis' ||
    practice.city === 'Bitte aktualisieren' ||
    practice.city === 'Stadt'
  );

  useEffect(() => {
    if (practice) {
      loadData();

      if (needsSetup && viewMode === 'per-provider') {
        setViewMode('settings');
      }

      const interval = setInterval(() => {
        setProviders((prev) => [...prev]);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [practice]);

  async function loadData() {
    if (!practice) return;

    try {
      setError(null);

      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('*')
        .eq('practice_id', practice.id)
        .order('name');

      if (providersError) throw providersError;

      const { data: delayData, error: delayError } = await supabase
        .from('delay_status')
        .select('*')
        .eq('practice_id', practice.id)
        .order('updated_at', { ascending: false });

      if (delayError) throw delayError;

      const providersWithDelays: ProviderWithDelay[] = (providersData || []).map((provider) => {
        const delay = delayData?.find((d) => d.provider_id === provider.id);
        return {
          ...provider,
          delay_minutes: delay?.delay_minutes ?? null,
          delay_updated_at: delay?.updated_at ?? null,
        };
      });

      setProviders(providersWithDelays);

      const practiceDelay = delayData?.find((d) => d.provider_id === null) || null;
      setPracticeWideDelay(practiceDelay);

      if (providersData && providersData.length > 0) {
        setViewMode('per-provider');
      } else {
        setViewMode('practice-wide');
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Fehler beim Laden der Daten: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateDelay(providerId: string | null, newDelayMinutes: number) {
    if (!practice || !user) return;

    const key = providerId || 'practice-wide';
    setUpdating(key);

    try {
      const clampedDelay = Math.max(0, Math.min(180, newDelayMinutes));
      const roundedDelay = Math.round(clampedDelay / 5) * 5;

      const payload = {
        practice_id: practice.id,
        provider_id: providerId,
        delay_minutes: roundedDelay,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (providerId === null) {
        // PostgreSQL UNIQUE doesn't match NULL=NULL, so upsert won't find a conflict.
        // Use limit(1) to handle potential duplicate rows from the old bug.
        const { data: rows } = await supabase
          .from('delay_status')
          .select('id')
          .eq('practice_id', practice.id)
          .is('provider_id', null)
          .order('updated_at', { ascending: false })
          .limit(1);

        const existing = rows?.[0] ?? null;

        if (existing) {
          const { error: updateError } = await supabase
            .from('delay_status')
            .update({ delay_minutes: roundedDelay, updated_by: user.id, updated_at: payload.updated_at })
            .eq('id', existing.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase.from('delay_status').insert(payload);
          if (insertError) throw insertError;
        }
      } else {
        const { error: upsertError } = await supabase
          .from('delay_status')
          .upsert(payload, { onConflict: 'practice_id,provider_id' });
        if (upsertError) throw upsertError;
      }

      await loadData();
    } catch (err: any) {
      console.error('Error updating delay:', err);
      setError('Fehler beim Aktualisieren: ' + err.message);
    } finally {
      setUpdating(null);
    }
  }

  function adjustDelay(providerId: string | null, currentDelay: number | null, adjustment: number) {
    const current = currentDelay ?? 0;
    updateDelay(providerId, current + adjustment);
  }

  function resetDelay(providerId: string | null) {
    updateDelay(providerId, 0);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Daten werden geladen...</div>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Kein Zugriff: Praxis nicht gefunden</AlertDescription>
        </Alert>
      </div>
    );
  }

  const patientUrl = window.location.origin + '/p/' + practice.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{practice.name}</h1>
              <p className="text-xs text-gray-500">{practice.city}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <HelpDialog />
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Abmelden</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ConnectionStatus />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* QR Code Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Patientenansicht</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div id="qr-print-area" className="flex-shrink-0">
              <QRCodeSVG value={patientUrl} size={120} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">
                Patienten können die aktuelle Wartezeit über diesen QR-Code abrufen:
              </p>
              <a
                href={'/p/' + practice.id}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline break-all"
              >
                {patientUrl}
              </a>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    const svg = document.querySelector('#qr-print-area svg')?.outerHTML ?? '';
                    printWindow.document.write(`
                      <html><head><title>QR-Code – ${practice.name}</title>
                      <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                        h2 { margin-bottom: 8px; }
                        p { color: #555; font-size: 14px; margin-top: 8px; word-break: break-all; text-align: center; }
                        svg { width: 240px; height: 240px; }
                      </style></head>
                      <body>
                        <h2>${practice.name}</h2>
                        ${svg}
                        <p>${patientUrl}</p>
                        <script>window.onload = () => { window.print(); window.close(); }<\/script>
                      </body></html>
                    `);
                    printWindow.document.close();
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <div className="mb-8">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              {providers.length > 0 && <TabsTrigger value="per-provider">Pro Arzt</TabsTrigger>}
              {/* TEMPORÄR AUSKOMMENTIERT <TabsTrigger value="practice-wide">Praxisweit</TabsTrigger> */}
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-1" />
                Einstellungen
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {needsSetup && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Bitte aktualisieren Sie Ihre Praxisinformationen im Tab "Einstellungen"
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Tab */}
        {viewMode === 'settings' && (
          <div className="mb-6">
            <PracticeSettings />
          </div>
        )}

        {/* Delay Content */}
        {viewMode !== 'settings' && (
          <>
            {/* TEMPORÄR AUSKOMMENTIERT
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Praxisweiter Verzug</CardTitle>
              </CardHeader>
              <CardContent>
                <DelayRow
                  name="Praxisweit"
                  specialty={null}
                  delayMinutes={practiceWideDelay?.delay_minutes ?? null}
                  updatedAt={practiceWideDelay?.updated_at ?? null}
                  onUpdate={(newDelay) => updateDelay(null, newDelay)}
                  onAdjust={(adjustment) => adjustDelay(null, practiceWideDelay?.delay_minutes ?? null, adjustment)}
                  onReset={() => resetDelay(null)}
                  disabled={viewMode === 'per-provider'}
                  isUpdating={updating === 'practice-wide'}
                />
              </CardContent>
            </Card>
            */}

            {providers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verzug pro Arzt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {providers.map((provider) => (
                    <DelayRow
                      key={provider.id}
                      name={provider.name}
                      specialty={provider.specialty}
                      delayMinutes={provider.delay_minutes}
                      updatedAt={provider.delay_updated_at}
                      onUpdate={(newDelay) => updateDelay(provider.id, newDelay)}
                      onAdjust={(adjustment) => adjustDelay(provider.id, provider.delay_minutes, adjustment)}
                      onReset={() => resetDelay(provider.id)}
                      disabled={viewMode === 'practice-wide'}
                      isUpdating={updating === provider.id}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {providers.length === 0 && (
              <Alert>
                <AlertDescription>
                  Keine Ärzte erfasst. Verwenden Sie den praxisweiten Verzug.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface DelayRowProps {
  name: string;
  specialty: string | null;
  delayMinutes: number | null;
  updatedAt: string | null;
  onUpdate: (newDelay: number) => void;
  onAdjust: (adjustment: number) => void;
  onReset: () => void;
  disabled: boolean;
  isUpdating: boolean;
}

function DelayRow({
  name,
  specialty,
  delayMinutes,
  updatedAt,
  onUpdate,
  onAdjust,
  onReset,
  disabled,
  isUpdating,
}: DelayRowProps) {
  const delayOptions = Array.from({ length: 37 }, (_, i) => i * 5);

  return (
    <div className={'p-4 border rounded-lg ' + (disabled ? 'bg-gray-50 opacity-60' : 'bg-white')}>
      <div className="flex flex-col gap-2">
        {/* Name and Specialty */}
        <div>
          <div className="font-semibold text-gray-900">{name}</div>
          {specialty && <div className="text-sm text-gray-500">{specialty}</div>}
        </div>

        {/* Current Delay Display */}
        <div>
          <div className="text-3xl font-bold text-gray-900">
            {delayMinutes !== null ? '+' + delayMinutes + ' Min' : 'keine Angabe'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {updatedAt ? formatRelativeTime(updatedAt) : '–'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mt-1">
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => onAdjust(-15)} disabled={disabled || isUpdating}>
              <Minus className="h-3 w-3" />15
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAdjust(-5)} disabled={disabled || isUpdating}>
              <Minus className="h-3 w-3" />5
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAdjust(5)} disabled={disabled || isUpdating}>
              <Plus className="h-3 w-3" />5
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAdjust(15)} disabled={disabled || isUpdating}>
              <Plus className="h-3 w-3" />15
            </Button>
          </div>
          <div className="flex gap-1">
            <Select
              value={delayMinutes?.toString() ?? ''}
              onValueChange={(value) => onUpdate(parseInt(value, 10))}
              disabled={disabled || isUpdating}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Wählen..." />
              </SelectTrigger>
              <SelectContent>
                {delayOptions.map((delay) => (
                  <SelectItem key={delay} value={delay.toString()}>
                    {delay} Min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" size="sm" onClick={onReset} disabled={disabled || isUpdating}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {isUpdating && (
        <div className="mt-2 text-sm text-blue-600">Aktualisiere...</div>
      )}
    </div>
  );
}