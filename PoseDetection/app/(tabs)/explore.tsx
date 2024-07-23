import React, { useRef, useState, useEffect } from "react";
import { StyleSheet, Button, Text, TouchableOpacity, View } from "react-native";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import CustomCanvas from "../Canvas";
import Canvas from "react-native-canvas";

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

export default function TabTwoScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [canvasContext, setCanvasContext] =
    useState<CanvasRenderingContext2D | null>(null);

  // Load model when permission is granted
  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
      console.log("Model loaded");
    };

    if (permission?.granted) {
      loadModel();
    }
  }, [permission]);

  // Initialize canvas context
  useEffect(() => {
    if (canvasContext) {
      // Ensure ctx is indeed a CanvasRenderingContext2D before using it
      console.log("Canvas context is ready");
    }
  }, [canvasContext]);

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
      <CameraView style={styles.camera} facing={facing} />
      <CustomCanvas
        style={styles.canvas}
        onCanvasReady={(canvas) => {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            setCanvasContext(ctx as unknown as CanvasRenderingContext2D);
          }
        }}
      />
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
