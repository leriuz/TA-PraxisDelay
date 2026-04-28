import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Building2, Save, AlertCircle, CheckCircle } from 'lucide-react';

export function PracticeSettings() {
  const { practice, refreshPractice } = useAuth();
  const [name, setName] = useState(practice?.name || '');
  const [city, setCity] = useState(practice?.city || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!practice) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('practices')
        .update({
          name: name.trim(),
          city: city.trim(),
        })
        .eq('id', practice.id);

      if (updateError) throw updateError;

      await refreshPractice();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating practice:', err);
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!practice) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-gray-600" />
          <div>
            <CardTitle>Praxisinformationen</CardTitle>
            <CardDescription>
              Aktualisieren Sie den Namen und Ort Ihrer Praxis
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Praxisinformationen erfolgreich aktualisiert!
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="practice-name">Praxisname</Label>
            <Input
              id="practice-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Praxis am Bahnhof"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="practice-city">Stadt</Label>
            <Input
              id="practice-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="z.B. Zürich"
              disabled={saving}
            />
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Praxis-ID:</strong>{' '}
            <code className="bg-gray-200 px-1 py-0.5 rounded">{practice.id}</code>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !city.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
