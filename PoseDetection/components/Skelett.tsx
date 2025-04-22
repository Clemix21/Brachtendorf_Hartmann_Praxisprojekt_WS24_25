import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { Keypoint } from "@tensorflow-models/pose-detection";

interface Props {
  keypoints: Keypoint[];
  angles: { [key: string]: number };
  width: number; // windowWidth
  height: number; // windowHeight
  inputWidth: number; // 640
  inputHeight: number; // 480
  mirrored?: boolean;
  detectedPoses: Set<string>; // Set mit erkannten Posen
}

const TOLERANCE = 15; // Erlaubte Abweichung

// Definiere optimale Winkel für verschiedene Posen
const OPTIMAL_ANGLES: { [pose: string]: { [joint: string]: number } } = {
  Wallsquat: { knee: 90, hip: 90, shoulder: 90 },
  Plank: { shoulder: 120, knee: 0, hip: 0 },
};

const PoseOverlay: React.FC<Props> = ({
  keypoints,
  angles,
  width,
  height,
  inputWidth,
  inputHeight,
  mirrored = false,
  detectedPoses,
}) => {
  if (!keypoints || keypoints.length === 0) return null;

  const scaleX = width / inputWidth;
  const scaleY = height / inputHeight;

  const transformX = (x: number) =>
    mirrored ? width - x * scaleX : x * scaleX;

  const transformY = (y: number) => y * scaleY;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {keypoints.map((point, index) =>
          point.score && point.score > 0.5 ? (
            <Circle
              key={index}
              cx={transformX(point.x)}
              cy={transformY(point.y)}
              r={5}
              fill="white"
            />
          ) : null
        )}

        {drawSkeleton(keypoints, angles, transformX, transformY, detectedPoses)}
      </Svg>
    </View>
  );
};

const SKELETON_EDGES = [
  ["left_shoulder", "right_shoulder", "shoulder"],
  ["left_shoulder", "left_elbow", "elbow"],
  ["left_elbow", "left_wrist", "elbow"],
  ["right_shoulder", "right_elbow", "elbow"],
  ["right_elbow", "right_wrist", "elbow"],
  ["left_hip", "right_hip", "hip"],
  ["left_hip", "left_knee", "knee"],
  ["left_knee", "left_ankle", "knee"],
  ["right_hip", "right_knee", "knee"],
  ["right_knee", "right_ankle", "knee"],
];

const drawSkeleton = (
  keypoints: Keypoint[],
  angles: { [key: string]: number },
  transformX: (x: number) => number,
  transformY: (y: number) => number,
  detectedPoses: Set<string>
) => {
  return SKELETON_EDGES.map(([pointA, pointB, joint], index) => {
    const kpA = keypoints.find((kp) => kp.name === pointA);
    const kpB = keypoints.find((kp) => kp.name === pointB);

    if (
      kpA?.score !== undefined &&
      kpB?.score !== undefined &&
      kpA.score > 0.5 &&
      kpB.score > 0.5
    ) {
      let color = "red"; // Standardfarbe

      detectedPoses.forEach((pose) => {
        if (OPTIMAL_ANGLES[pose] && OPTIMAL_ANGLES[pose][joint] !== undefined) {
          const optimalAngle = OPTIMAL_ANGLES[pose][joint];
          const actualAngle = angles[joint] || 0;

          if (Math.abs(actualAngle - optimalAngle) < TOLERANCE) {
            color = "green";
          } else {
            color = "red";
          }
        }
      });

      return (
        <Line
          key={index}
          x1={transformX(kpA.x)}
          y1={transformY(kpA.y)}
          x2={transformX(kpB.x)}
          y2={transformY(kpB.y)}
          stroke={color}
          strokeWidth={3}
        />
      );
    }
    return null;
  });
};

export default PoseOverlay;
