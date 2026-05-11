import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { HelpCircle } from 'lucide-react';

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="h-4 w-4 mr-2" />
          Hilfe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Waittime Admin – Kurzanleitung</DialogTitle>
          <DialogDescription>
            So verwalten Sie Verzüge für Ihre Praxis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Two Modes */}
          <section>
            <h3 className="font-semibold text-base mb-2">Zwei Modi</h3>
            <div className="space-y-2">
              <div>
                <strong className="text-blue-700">Pro Arzt</strong>
                <p className="text-gray-600">
                  Jeder Arzt hat seinen eigenen Verzug. Verwenden Sie diesen Modus, wenn unterschiedliche 
                  Ärzte unterschiedliche Verzüge haben.
                </p>
              </div>
              <div>
                <strong className="text-blue-700">Praxisweit</strong>
                <p className="text-gray-600">
                  Ein Verzug gilt für die ganze Praxis. Alle Ärzte haben denselben Verzug. 
                  Einfacher, wenn die ganze Praxis gleichmässig im Verzug ist.
                </p>
              </div>
            </div>
          </section>

          {/* Quick Controls */}
          <section>
            <h3 className="font-semibold text-base mb-2">Schnell-Bedienung</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>-15 Min / -5 Min</strong>: Verzug verringern</li>
              <li><strong>+5 Min / +15 Min</strong>: Verzug erhöhen</li>
              <li><strong>Dropdown</strong>: Exakten Wert (0-180 Min) wählen</li>
              <li><strong>Reset 0</strong>: Verzug auf 0 zurücksetzen</li>
            </ul>
            <p className="text-gray-500 text-xs mt-2">
              Verzug wird immer in 5-Minuten-Schritten gespeichert.
            </p>
          </section>

          {/* Typical Workflow */}
          <section>
            <h3 className="font-semibold text-base mb-2">Typischer Ablauf</h3>
            <div className="space-y-2 text-gray-600">
              <div>
                <strong>Morgen (Praxis startet pünktlich)</strong>
                <p>Verzug ist bei 0 Min. Nichts tun.</p>
              </div>
              <div>
                <strong>Vormittag (10:00 Uhr, erste Verzögerungen)</strong>
                <p>Wählen Sie "+15 Min" oder "+20 Min" via Dropdown.</p>
              </div>
              <div>
                <strong>Mittag (Verzug nimmt zu)</strong>
                <p>Erhöhen Sie mit "+5 Min" oder "+15 Min".</p>
              </div>
              <div>
                <strong>Nachmittag (Verzug baut sich ab)</strong>
                <p>Verringern Sie mit "-5 Min" oder "-15 Min".</p>
              </div>
              <div>
                <strong>Ende Tag (wieder im Plan)</strong>
                <p>Klicken Sie "Reset 0" oder verwenden Sie "-X Min" bis 0.</p>
              </div>
            </div>
          </section>

          {/* What Patients See */}
          <section>
            <h3 className="font-semibold text-base mb-2">Was Patienten sehen</h3>
            <p className="text-gray-600 mb-2">
              Die Patienten-App (in Entwicklung) zeigt:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>0 Min</strong> → "Praxis meldet: im Plan"</li>
              <li><strong>5-15 Min</strong> → "Praxis meldet: im Rückstand"</li>
              <li><strong>20+ Min</strong> → "Praxis meldet: stark im Rückstand"</li>
            </ul>
            <p className="text-gray-500 text-xs mt-2">
              Die Patienten sehen auch "Zuletzt aktualisiert vor X Min".
            </p>
          </section>

          {/* Best Practices */}
          <section>
            <h3 className="font-semibold text-base mb-2">Best Practices</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Aktualisieren Sie den Verzug alle 15-30 Minuten</li>
              <li>Seien Sie eher realistisch/vorsichtig als optimistisch</li>
              <li>Im Zweifel: +5 Min hinzufügen</li>
              <li>Wenn Verzug unter 5 Min: auf 0 setzen</li>
              <li>Ende Tag: Verzug auf 0 zurücksetzen</li>
            </ul>
          </section>

          {/* Troubleshooting */}
          <section>
            <h3 className="font-semibold text-base mb-2">Probleme?</h3>
            <div className="space-y-2 text-gray-600">
              <div>
                <strong>Verzug lässt sich nicht speichern</strong>
                <p>Prüfen Sie Ihre Internetverbindung. Seite neu laden und erneut versuchen.</p>
              </div>
              <div>
                <strong>Falsche Praxis angezeigt</strong>
                <p>Ausloggen und mit korrekten Anmeldedaten erneut einloggen.</p>
              </div>
              <div>
                <strong>Arzt fehlt in der Liste</strong>
                <p>Kontaktieren Sie Ihren Administrator. Ärzte können nur von Admins hinzugefügt werden.</p>
              </div>
            </div>
          </section>

          {/* Privacy Note */}
          <section className="bg-gray-50 p-3 rounded border border-gray-200">
            <h3 className="font-semibold text-base mb-1">Datenschutz</h3>
            <p className="text-gray-600 text-xs">
              Diese Anwendung speichert nur Praxis-, Arzt- und Verzug-Informationen. 
              Es werden keine Patientendaten erfasst oder gespeichert. 
              Alle Daten sind über Supabase sicher gespeichert und verschlüsselt.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
