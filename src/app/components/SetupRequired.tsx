import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { AlertCircle, Copy, Check, LogOut, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface SetupRequiredProps {
  profile: Profile;
}

export function SetupRequired({ profile }: SetupRequiredProps) {
  const { signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const quickFixSQL = `INSERT INTO public.practices (id, name, city) VALUES ('${profile.practice_id}', 'Neue Praxis', 'Bitte aktualisieren');`;

  const fullFixSQL = `-- Create your practice
INSERT INTO public.practices (id, name, city) 
VALUES ('${profile.practice_id}', 'Neue Praxis', 'Bitte aktualisieren');

-- Prevent this issue for future users (optional but recommended)
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.practices WHERE id = NEW.practice_id) THEN
        INSERT INTO public.practices (id, name, city)
        VALUES (NEW.practice_id, 'Neue Praxis', 'Bitte aktualisieren')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(showAdvanced ? fullFixSQL : quickFixSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl border-2 border-orange-200">
        <CardHeader className="bg-orange-100 border-b-2 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500 rounded-lg shadow-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-orange-900">Setup erforderlich</CardTitle>
              <p className="text-sm text-orange-700 mt-1">
                Ihre Praxis muss noch in der Datenbank angelegt werden
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Big Prominent Call to Action */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <Zap className="h-8 w-8 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Schnelle Lösung (1 Minute)</h3>
                <ol className="space-y-2 text-sm mb-4">
                  <li className="flex items-baseline gap-2">
                    <span className="font-bold">1.</span>
                    <span>Klicken Sie auf "SQL kopieren" unten</span>
                  </li>
                  <li className="flex items-baseline gap-2">
                    <span className="font-bold">2.</span>
                    <span>Öffnen Sie Supabase → SQL Editor</span>
                  </li>
                  <li className="flex items-baseline gap-2">
                    <span className="font-bold">3.</span>
                    <span>Fügen Sie den SQL-Code ein und klicken Sie "Run"</span>
                  </li>
                  <li className="flex items-baseline gap-2">
                    <span className="font-bold">4.</span>
                    <span>Laden Sie diese Seite neu (F5)</span>
                  </li>
                </ol>
                <Button
                  size="lg"
                  onClick={handleCopy}
                  className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      ✓ Kopiert! Jetzt in Supabase einfügen
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5 mr-2" />
                      SQL kopieren
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* SQL Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-700">SQL-Code zum Kopieren:</h4>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {showAdvanced ? (
                  <>
                    Einfache Version <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Erweiterte Version (mit Auto-Fix) <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto border-2 border-gray-700 font-mono">
              {showAdvanced ? fullFixSQL : quickFixSQL}
            </pre>
            {showAdvanced && (
              <p className="text-xs text-gray-600">
                ✨ Die erweiterte Version verhindert dieses Problem auch für zukünftige Benutzer
              </p>
            )}
          </div>

          {/* Info Box */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-900">
              <strong>Was passiert?</strong> Das SQL-Skript erstellt einen Praxiseintrag mit der ID{' '}
              <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">
                {profile.practice_id}
              </code>
              . Nach dem Neuladen können Sie Name und Stadt im Tab "Einstellungen" ändern.
            </AlertDescription>
          </Alert>

          {/* Troubleshooting */}
          <details className="border rounded-lg p-4 bg-gray-50">
            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              🔧 Probleme? Hilfe anzeigen
            </summary>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div>
                <strong>Wo finde ich den SQL Editor?</strong>
                <p>Supabase Dashboard → Linke Seitenleiste → "SQL Editor"</p>
              </div>
              <div>
                <strong>Der SQL-Code funktioniert nicht:</strong>
                <p>Stellen Sie sicher, dass Sie die Migration <code className="bg-gray-200 px-1 rounded">001_initial_schema.sql</code> bereits ausgeführt haben.</p>
              </div>
              <div>
                <strong>Mehr Hilfe:</strong>
                <p>Siehe <code className="bg-gray-200 px-1 rounded">/supabase/migrations/TROUBLESHOOTING.md</code></p>
              </div>
            </div>
          </details>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Praxis-ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{profile.practice_id}</code>
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
