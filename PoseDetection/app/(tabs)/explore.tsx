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
    }, 500); // 500 ms = 0.5 Sekunde

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
    setPoses(predictions); // Speichert Keypoints für das nächste Rendering

    console.log("Predictions:", predictions); // Keypoints in der Konsole anzeigen

    img.dispose(); // Speicher freigeben
    imageBitmap.close(); // ImageBitmap freigeben
  };

  const onCameraReady = () => {
    setIsCameraReady(true);
    const intervalId = setInterval(onCameraFrame, 500); // Capture frame alle 500ms

    return () => clearInterval(intervalId); // Aufräumen
  };

  const vertexShaderSource = `
  attribute vec2 a_position;
  uniform float u_pointSize;
  uniform vec2 u_resolution;

  void main() {
    // Normiere die Position
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;

    // Transformiere die Position ins Clip-Space
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    gl_PointSize = u_pointSize;
  }
`;

  const fragmentShaderSource = `
  precision mediump float;
  uniform vec4 u_color;

  void main() {
    gl_FragColor = u_color;
  }
`;

  const onContextCreate = async (
    gl: WebGLRenderingContext & { endFrameEXP: () => void }
  ) => {
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);
    if (!program) {
      console.error("Program creation failed");
      return;
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "u_resolution"
    );
    const colorUniformLocation = gl.getUniformLocation(program, "u_color");
    const pointSizeUniformLocation = gl.getUniformLocation(
      program,
      "u_pointSize"
    );

    gl.uniform2f(
      resolutionUniformLocation,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight
    );
    gl.uniform4f(colorUniformLocation, 1.0, 0.0, 0.0, 1.0); // Farbe rot
    gl.uniform1f(pointSizeUniformLocation, 10.0); // Punktgröße

    const render = () => {
      if (gl) {
        // Bildschirm mit einer durchsichtigen Farbe löschen
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Über Keypoints iterieren und zeichnen
        poses.forEach((pose) => {
          if (pose.keypoints) {
            pose.keypoints.forEach((keypoint) => {
              drawKeypoint(gl, positionLocation, keypoint);
            });
          }
        });

        // Ende des Frames signalisieren
        gl.endFrameEXP();
      }
    };

    let animationFrameId: number;

    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    // Cleanup-Logik für unmount
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  };

  // Funktion zum Erstellen eines Shaders
  function createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Funktion zum Erstellen eines Programms mit Vertex- und Fragment-Shader
  function createProgram(
    gl: WebGLRenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string
  ): WebGLProgram | null {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link failed:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function calculateAngle(
    left_shoulder: { x: number; y: number },
    left_hip: { x: number; y: number },
    left_elbow: { x: number; y: number }
  ): number {
    // Berechne die Vektoren
    const vector_shoulder_hip = {
      x: left_hip.x - left_shoulder.x,
      y: left_hip.y - left_shoulder.y,
    };
    const vector_shoulder_elbow = {
      x: left_elbow.x - left_shoulder.x,
      y: left_elbow.y - left_shoulder.y,
    };

    // Skalarprodukt berechnen
    const dot_product =
      vector_shoulder_hip.x * vector_shoulder_elbow.x +
      vector_shoulder_hip.y * vector_shoulder_elbow.y;

    // Längen der Vektoren berechnen
    const length_shoulder_hip = Math.sqrt(
      vector_shoulder_hip.x ** 2 + vector_shoulder_hip.y ** 2
    );
    const length_shoulder_elbow = Math.sqrt(
      vector_shoulder_elbow.x ** 2 + vector_shoulder_elbow.y ** 2
    );

    // Kosinus des Winkels berechnen
    const cos_theta =
      dot_product / (length_shoulder_hip * length_shoulder_elbow);

    // Winkel in Grad umwandeln
    const angle = Math.acos(cos_theta) * (180 / Math.PI);

    return angle;
  }

  // Beispielkoordinaten der Punkte
  const left_shoulder = { x: 539.4, y: 385.4 };
  const left_hip = { x: 631.3, y: 491.7 };
  const left_elbow = { x: 608.0, y: 477.2 };

  // Berechnung des Winkels
  const shoulderAngle = calculateAngle(left_shoulder, left_hip, left_elbow);
  console.log(`Winkel an der Schulter: ${shoulderAngle.toFixed(2)} Grad`);

  // Funktion zum Zeichnen eines Keypoints
  function drawKeypoint(
    gl: WebGLRenderingContext,
    positionLocation: number,
    keypoint: { x: number; y: number; score?: number }
  ): void {
    const { x, y, score } = keypoint;
    if (!score || score < 0.5) return; // Nur Keypoints mit einem gültigen Score über 0.5 zeichnen

    const canvasWidth = gl.drawingBufferWidth;
    const canvasHeight = gl.drawingBufferHeight;

    // Anpassen der Keypoint-Koordinaten an die Canvasgröße
    const adjustedX = (x / 640) * canvasWidth;
    const adjustedY = (y / 480) * canvasHeight;

    const points = new Float32Array([adjustedX, adjustedY]);

    // Erstellen und binden eines Puffers für den Punkt
    const buffer = gl.createBuffer();
    if (!buffer) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

    // Attribut aktivieren und auf die Pufferdaten verweisen
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Zeichnen des Punkts
    gl.drawArrays(gl.POINTS, 0, 1);

    // Aufräumen: Puffer deaktivieren und löschen
    gl.disableVertexAttribArray(positionLocation);
    gl.deleteBuffer(buffer);
  }

  // Falls das Component unmounted wird
  useEffect(() => {
    return () => {
      if (detector) {
        detector.dispose(); // Pose-Detector freigeben
      }
    };
  }, [detector]);

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
