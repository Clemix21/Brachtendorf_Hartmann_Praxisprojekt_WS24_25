Praxisprojekt WS 24/25

Für das Modul Praxisprojekt habe ich mir überlegt, eine mobile Anwendung zu entwickeln, die mithilfe von Videotracking zur Korrektur der Haltung bei Kraftsport- und Cardioübungen wie Wallsquats oder Planks genutzt werden kann. Die Anwendung nutzt die Kamera des Geräts, um die Körperhaltung der Nutzer*innen in Echtzeit zu analysieren und sofortiges Feedback zur Verbesserung der Übungsausführung zu geben.

Das System erfasst kontinuierlich Bilder der Übungsausführung der Nutzer*innen und verwendet das Pose Detection Modell, um die Positionen von Gelenkpunkten wie Ellbogen, Schultern, Knien und Hüften zu bestimmen. Diese Daten werden analysiert, um Abweichungen von der korrekten Haltung zu identifizieren.

Technisch basiert die Implementierung auf React Native, um plattformübergreifende Kompatibilität zu gewährleisten. Zur Bewegungsanalyse wird TensorFlow.js eingesetzt, insbesondere die Pose Detection Bibliothek von TensorFlow, die präzise Erkennung der Körperhaltungen ermöglicht. Die Pose Detection Bibliothek nutzt fortschrittliche Algorithmen und Machine Learning Modelle wie MoveNet, um in Echtzeit die Position und Ausrichtung von bis zu 17 Schlüsselgelenken im menschlichen Körper zu erkennen. Die Echtzeit-Feedback-Schleife nutzt diese Technologien, um die Position von Schlüsselgelenken zu überwachen und bei Abweichungen vom korrekten Bewegungsmuster sofortige Korrekturhinweise zu geben. Um eine gewisse Barrierefreiheit zu gewährleisten, wird das Feedback zukünftig nicht nur visuell, sondern auch haptisch und über Audioausgaben vermittelt.
