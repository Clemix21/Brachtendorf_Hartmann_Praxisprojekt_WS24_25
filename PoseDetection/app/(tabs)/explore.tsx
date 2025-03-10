import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  Button,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import {
  CameraType,
  CameraView,
  useCameraPermissions,
  ImageSize,
} from "expo-camera";
import { GLView } from "expo-gl"; // Expo's GLView
import * as Speech from "expo-speech";

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl"; // TensorFlow with WebGL backend

import { Pose, Keypoint } from "@tensorflow-models/pose-detection";
import PoseOverlay from "@/components/Skelett";

export default function TabTwoScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(
    null
  );
  const [poses, setPoses] = useState<Pose[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false); // Zustand zur Verfolgung, ob die Kamera bereit ist
  const [angles, setAngles] = useState({
    elbow: 0,
    knee: 0,
    hip: 0,
    shoulder: 0,
  }); // Zustand für die Winkel
  const [wallsquatStatus, setWallsquatStatus] = useState<string>(""); // Status für die Wallsquat-Erkennung
  const [plankStatus, setPlankStatus] = useState<string>(""); // Status für die Plank-Erkennung
  const [wallsquatColor, setWallsquatColor] = useState<string>("red");
  const [plankColor, setPlankColor] = useState<string>("red");

  enum Poses {
    WALLSQUAT = "Wallsquat",
    PLANK = "Plank",
  }

  const [poseDetected, setPoseDetected] = useState<Set<Poses>>(new Set());

  const updatePoseDetected = (poses: Poses, detected: boolean) => {
    setPoseDetected((prev) => {
      const newSet = new Set(prev);
      if (detected) {
        newSet.add(poses);
      } else {
        newSet.delete(poses);
      }
      return newSet;
    });
  };

  const prevPoseDetected = useRef(poseDetected); // Speichert den vorherigen Zustand von poseDetected
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true); // Switch-Status für Audio-Feedback
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const TOLERANCE = 15; // Erlaubte Abweichung

  useEffect(() => {
    if (audioFeedbackEnabled) {
      Object.values(Poses).forEach((poses) => {
        const wasDetected = prevPoseDetected.current.has(poses);
        const isDetected = poseDetected.has(poses);

        if (wasDetected !== isDetected) {
          if (isDetected) {
            Speech.speak(`${poses} erkannt!`, {
              language: "de",
              pitch: 1.0,
              rate: 1.0,
            });
          } else {
            Speech.speak(`Bitte die ${poses}-Position korrigieren.`, {
              language: "de",
              pitch: 1.0,
              rate: 1.0,
            });
          }
        }
      });
    }

    prevPoseDetected.current = new Set(poseDetected);
  }, [poseDetected, audioFeedbackEnabled]);

  const cameraRef = useRef<CameraView | null>(null); // Referenz zur Kamera
  const glRef = useRef<WebGLRenderingContext | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      await tf.setBackend("webgl");
      await tf.ready();
      const poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet
      );
      setDetector(poseDetector);
      console.log("Model loaded");
    };

    if (permission?.granted) {
      loadModel();
    }
  }, [permission]);

  useEffect(() => {
    const interval = setInterval(() => {
      onCameraFrame(); // Rufe die Funktion in regelmäßigen Abständen auf
    }, 200); // 1000 ms = 1 Sekunde

    return () => clearInterval(interval); // Bereinige den Timer, wenn das Component unmountet wird
  }, [detector, isCameraReady]);

  useEffect(() => {
    if (poseDetected.size > 0 && !isRunning) {
      setIsRunning(true);
      setTimer(0);
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else if (poseDetected.size === 0 && isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = null;
      setIsRunning(false);
    }
  }, [poseDetected]);

  // debugging
  // useEffect(() => {
  // console.log("Pose Detected:", poseDetected);
  // console.log("Timer Running:", isRunning);
  // console.log("Timer Value:", timer);
  // console.log("Size", poseDetected.size);
  // console.log(poseDetected.has(Poses.WALLSQUAT));
  // console.log(poseDetected.has(Poses.PLANK));
  // console.log("🔥 Timer läuft?", intervalRef.current);
  // console.log("👀 Pose erkannt:", poseDetected);
  // console.log("intervalRef.current:", intervalRef.current);
  // console.log("intervalRef:", intervalRef);
  // }, [
  //   poseDetected,
  //   timer,
  //   poseDetected.size,
  //   intervalRef.current,
  //   intervalRef,
  // ]);

  const onCameraFrame = async () => {
    if (!detector || !isCameraReady || !cameraRef.current) return;
    //console.log("Attempting to capture a frame");

    const frame = await cameraRef.current.takePictureAsync({
      skipProcessing: true,
    });

    if (!frame) {
      console.warn("No frame captured");
      return;
    }

    // console.log("Frame captured:", frame);

    // Bild in ein ImageBitmap konvertieren
    const imageBitmap = await fetch(frame.uri)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob));

    // Übergeben der ImageBitmap an pose detector
    const img = tf.browser.fromPixels(imageBitmap);
    const predictions = await detector.estimatePoses(img);
    setPoses(predictions);

    console.log("Predictions:", predictions); // Keypoints in der Konsole anzeigen

    // Berechne die Winkel
    if (predictions.length > 0) {
      const leftShoulder = predictions[0].keypoints.find(
        (k) => k.name === "left_shoulder"
      );
      const leftElbow = predictions[0].keypoints.find(
        (k) => k.name === "left_elbow"
      );
      const leftWrist = predictions[0].keypoints.find(
        (k) => k.name === "left_wrist"
      );

      const leftHip = predictions[0].keypoints.find(
        (k) => k.name === "left_hip"
      );
      const leftKnee = predictions[0].keypoints.find(
        (k) => k.name === "left_knee"
      );
      const leftAnkle = predictions[0].keypoints.find(
        (k) => k.name === "left_ankle"
      );

      let elbowAngle = 0;
      let kneeAngle = 0;
      let hipAngle = 0;
      let shoulderAngle = 0;

      if (leftShoulder && leftElbow && leftWrist) {
        elbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
      }

      if (leftHip && leftKnee && leftAnkle) {
        kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      }

      if (leftShoulder && leftHip && leftKnee) {
        hipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
      }

      if (leftElbow && leftShoulder && leftHip) {
        shoulderAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
      }

      setAngles({
        elbow: elbowAngle,
        knee: kneeAngle,
        hip: hipAngle,
        shoulder: shoulderAngle,
      });

      // Wallsquat-Erkennung
      if (
        Math.abs(kneeAngle - 90) < TOLERANCE &&
        Math.abs(hipAngle - 90) < TOLERANCE &&
        Math.abs(shoulderAngle - 90) < TOLERANCE
      ) {
        //  ||
        // Math.abs(elbowAngle - 90) < TOLERANCE
        setWallsquatStatus("Wallsquat erkannt!"); // Wallsquat erkannt
        setWallsquatColor("green");
        updatePoseDetected(Poses.WALLSQUAT, true);
      } else {
        setWallsquatStatus("Nicht in Wallsquat-Position."); // Keine Wallsquat-Position
        setWallsquatColor("red");
        updatePoseDetected(Poses.WALLSQUAT, false);
      }

      // Plank-Erkennung
      if (
        Math.abs(shoulderAngle - 120) < TOLERANCE &&
        Math.abs(kneeAngle) < TOLERANCE &&
        Math.abs(hipAngle) < TOLERANCE
      ) {
        // || Math.abs(elbowAngle) < TOLERANCE
        setPlankStatus("Plank erkannt!"); // Plank erkannt
        setPlankColor("green");
        updatePoseDetected(Poses.PLANK, true);
      } else {
        setPlankStatus("Nicht in Plank-Position."); // Keine Plank-Position
        setPlankColor("red");
        updatePoseDetected(Poses.PLANK, false);
      }
    }

    img.dispose(); // Speicher freigeben
    imageBitmap.close(); // ImageBitmap freigeben
  };

  const onCameraReady = () => {
    setIsCameraReady(true);
    const intervalId = setInterval(onCameraFrame, 500); // Capture frame alle 100ms

    return () => clearInterval(intervalId); // Aufräumen
  };

  function calculateAngle(
    pointA: Keypoint,
    pointB: Keypoint,
    pointC: Keypoint
  ) {
    // Vektoren berechnen
    const vector_AB = {
      x: pointB.x - pointA.x,
      y: pointB.y - pointA.y,
    };
    const vector_BC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y,
    };

    // Skalarprodukt der Vektoren berechnen
    const dot_product = vector_AB.x * vector_BC.x + vector_AB.y * vector_BC.y;

    // Längen der Vektoren berechnen
    const length_AB = Math.sqrt(vector_AB.x ** 2 + vector_AB.y ** 2);
    const length_BC = Math.sqrt(vector_BC.x ** 2 + vector_BC.y ** 2);

    // Kosinus des Winkels berechnen
    const cos_angle = dot_product / (length_AB * length_BC);

    // Winkel in Grad umrechnen
    const angle = Math.acos(cos_angle) * (180 / Math.PI);

    return angle;
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  if (poses.length > 0) {
    // Keypoints für Berechnung des eingeschlossenen Winkels von Schulter, Ellbogen und Handgelenk
    const leftShoulder = poses[0].keypoints.find(
      (k) => k.name === "left_shoulder"
    );
    const leftElbow = poses[0].keypoints.find((k) => k.name === "left_elbow");
    const leftWrist = poses[0].keypoints.find((k) => k.name === "left_wrist");

    // Keypoints für Berechnung des eingeschlossenen Winkels von Ober- und Unterschenkel
    const leftHip = poses[0].keypoints.find((k) => k.name === "left_hip");
    const leftKnee = poses[0].keypoints.find((k) => k.name === "left_knee");
    const leftAnkle = poses[0].keypoints.find((k) => k.name === "left_ankle");
  }

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef} // Referenz zur Kamera hier setzen
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* <GLView style={styles.canvas} onContextCreate={onContextCreate} /> */}

      {poses.length > 0 && poses[0].keypoints ? (
        <PoseOverlay
          keypoints={poses[0].keypoints}
          angles={angles}
          width={1000}
          height={625}
          mirrored={facing === "back"}
        />
      ) : null}

      <View style={styles.overlay}>
        {/* Timer anzeigen */}
        <Text style={styles.timerText}>Timer: {timer} Sekunden</Text>

        {/* Audio-Feedback */}
        <Text style={styles.angleText}>Audio-Feedback</Text>
        <Switch
          value={audioFeedbackEnabled}
          onValueChange={setAudioFeedbackEnabled}
        />

        {/* Echtzeit-Log für Wallsquat-Status */}
        <View style={[styles.statusBox, { backgroundColor: wallsquatColor }]}>
          <Text style={styles.statusText}>{wallsquatStatus}</Text>
        </View>

        {/* Echtzeit-Log für Plank-Status */}
        <View style={[styles.statusBox, { backgroundColor: plankColor }]}>
          <Text style={styles.statusText}>{plankStatus}</Text>
        </View>

        {/* Winkelanzeige */}
        <Text style={styles.angleText}>
          Elbow Angle: {angles.elbow.toFixed(2)}°
        </Text>
        <Text style={styles.angleText}>
          Knee Angle: {angles.knee.toFixed(2)}°
        </Text>
        <Text style={styles.angleText}>
          Hip Angle: {angles.hip.toFixed(2)}°
        </Text>
        <Text style={styles.angleText}>
          Shoulder Angle: {angles.shoulder.toFixed(2)}°
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Flip Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  text: {
    fontSize: 16,
    color: "white",
  },
  overlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 8,
  },
  statusBox: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  statusText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  angleText: {
    color: "white",
    fontSize: 16,
    marginBottom: 5,
  },
  timerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 10,
  },
});
