import React, { useRef, useState, useEffect } from "react";
import { StyleSheet, Button, Text, TouchableOpacity, View } from "react-native";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { GLView } from "expo-gl"; // Expo's GLView

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl"; // TensorFlow with WebGL backend

import { Pose, Keypoint } from "@tensorflow-models/pose-detection";

export default function TabTwoScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(
    null
  );
  const [poses, setPoses] = useState<Pose[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false); // Zustand zur Verfolgung, ob die Kamera bereit ist

  const cameraRef = useRef<CameraView | null>(null); // Referenz zur Kamera
  const glRef = useRef<WebGLRenderingContext | null>(null);

  useEffect(() => {
    const loadModel = async () => {
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
    }, 1000); // 1000 ms = 1 Sekunde

    return () => clearInterval(interval); // Bereinige den Timer, wenn das Component unmountet wird
  }, [detector, isCameraReady]);

  const onCameraFrame = async () => {
    if (!detector || !isCameraReady || !cameraRef.current) return;

    console.log("Attempting to capture a frame");

    const frame = await cameraRef.current.takePictureAsync({
      skipProcessing: true,
    });

    if (!frame) {
      console.warn("No frame captured");
      return;
    }

    console.log("Frame captured:", frame);

    // Bild in ein ImageBitmap konvertieren
    const imageBitmap = await fetch(frame.uri)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob));

    // Übergeben der ImageBitmap an pose detector
    const img = tf.browser.fromPixels(imageBitmap);
    const predictions = await detector.estimatePoses(img);
    setPoses(predictions);

    console.log("Predictions:", predictions); // Keypoints in der Konsole anzeigen

    img.dispose(); // Speicher freigeben
    imageBitmap.close(); // ImageBitmap freigeben
  };

  const onCameraReady = () => {
    setIsCameraReady(true);
    const intervalId = setInterval(onCameraFrame, 100); // Capture frame alle 100ms

    return () => clearInterval(intervalId); // Aufräumen
  };

  const onContextCreate = async (
    gl: WebGLRenderingContext & { endFrameEXP: () => void }
  ) => {
    // Erster Versuch Rendering Logik
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const render = () => {
      if (gl) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        poses.forEach((pose) => {
          if (pose.keypoints) {
            pose.keypoints.forEach((keypoint) => {
              drawKeypoint(gl, keypoint);
            });
          }
        });
        gl.endFrameEXP();
      }
    };

    const loop = () => {
      render();
      requestAnimationFrame(loop);
    };
    loop();
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

    if (leftHip && leftKnee && leftAnkle) {
      const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      console.log(
        `Winkel zwischen Hüfte, Knie und Sprunggelenk: ${kneeAngle.toFixed(2)} Grad`
      );
    } else {
      console.warn(
        "Einige Keypoints fehlen für die Winkelberechnung der Beine."
      );
    }

    if (leftShoulder && leftElbow && leftWrist) {
      const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
      console.log(
        `Winkel zwischen Schulter, Ellbogen und Handgelenk: ${angle.toFixed(2)} Grad`
      );
    }
  } else {
    console.warn("Keine Posen erkannt");
  }

  const drawKeypoint = (gl: WebGLRenderingContext, keypoint: Keypoint) => {
    const { x, y } = keypoint;
    const points = new Float32Array([x, y]);
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

    const positionLocation = 0;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.deleteBuffer(buffer);
  };

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

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef} // Referenz zur Kamera hier setzen
        style={styles.camera}
        facing={facing}
        onCameraReady={onCameraReady}
      />
      <GLView style={styles.canvas} onContextCreate={onContextCreate} />
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
});
