* Praxisprojekt WS 24/25 Clemens Brachtendorf
*** Exposé: Entwicklung einer mobilen Anwendung zur Korrektur der Haltung bei Kraftsportübungen

** Problemraum 
Die Idee hat sich mit der Projektausarbeitung im Modul Mensch-Computer Interaktion entwickelt, in der es um Kardiovaskuläre Gesundheit, speziell Methoden zur Vorbeugung von Herz-Kreislauf-Erkrankungen ging. 
Einer der wichtigsten Schlüsselpunkte zur Prävention, die sich aus dieser Arbeit herauskristallisiert haben, war die korrekte Durchführung von Kraftsportübungen und kardiovaskulärem Training.
Jedoch finden Menschen oft nicht die Motivation ein Training zu starten oder führen die Übungen nicht richtig aus, wodurch der Effekt des Trainings stark gelindert wird.

** Resultierende Fragestellung
Wie kann man Menschen dabei helfen ihre Kraftsport- und Kardioübungen immer mit einer korrekten Haltung durchzuführen?

** Zielsetzung
Zur Lösung dieses Problems wurde folgender Ansatz, eine mobile Anwendung zu entwickeln, die Videotracking zur Korrektur der Haltung bei Kraftsport- und Kardioübungen wie Wallsquats oder Planks nutzt, konzeptioniert.
Die Anwendung nutzt die Kamera des Geräts, um die Körperhaltung der Nutzer*innen in Echtzeit zu analysieren und sofortiges Feedback zur Verbesserung der Übungsausführung zu geben.

** Technologien
Das System erfasst kontinuierlich Bilder der Übungsausführung der Nutzer*innen und verwendet Machine Learning Modell eines Frameworks zur datenstromorientierten Programmierung (TensorFlow), um die Positionen von Gelenkpunkten wie Ellbogen, Schultern, Knien und Hüften zu bestimmen. Diese Daten werden analysiert, um Abweichungen von der korrekten Haltung zu identifizieren.
Technisch basiert die Implementierung auf React Native, um plattformübergreifende Kompatibilität zu gewährleisten. Zur Bewegungsanalyse wird die Pose Detection Bibliothek von TensorFlow, die präzise Erkennung der Körperhaltungen ermöglicht, genutzt. Die Pose Detection Bibliothek nutzt fortschrittliche Algorithmen und Machine Learning Modelle wie MoveNet, um in Echtzeit die Position und Ausrichtung von bis zu 17 Schlüsselgelenken im menschlichen Körper zu erkennen. 

** Mögliche Weiterentwicklungen
Zukünftig könnte mit Gamification auf den Motivationsaspekt eingegangen werden, indem man Nutzer*innen in einem Punktesystem Belohnungen und Ziele bereitstellt.
Ebenso könnten verschiedenste Wearables wie Smartwatches oder Haptik-Westen einsetzt werden um Gesundheitsdaten der Anwender*innen zu überwachen und Ihnen diese auch in Statistiken zurückzugeben.
Um eine gewisse Barrierefreiheit zu gewährleisten, könnte das Feedback nicht nur visuell, sondern auch haptisch und über Audioausgaben vermittelt werden.

