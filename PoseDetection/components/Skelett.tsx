import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { Keypoint } from "@tensorflow-models/pose-detection";

interface Props {
  keypoints: Keypoint[];
  angles: { [key: string]: number };
  width: number;
  height: number;
  mirrored?: boolean;
}

const TOLERANCE = 15;
const OPTIMAL_ANGLES: { [key: string]: number } = {
  elbow: 90,
  knee: 90,
  hip: 90,
  shoulder: 120,
};

const PoseOverlay: React.FC<Props> = ({
  keypoints,
  angles,
  width,
  height,
  mirrored = false,
}) => {
  if (!keypoints || keypoints.length === 0) return null;

  const transformX = (x: number) => (mirrored ? width - x : x);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {keypoints.map((point, index) =>
          point.score && point.score > 0.5 ? (
            <Circle
              key={index}
              cx={transformX(point.x)}
              cy={point.y}
              r={5}
              fill="red"
            />
          ) : null
        )}

        {drawSkeleton(keypoints, angles, transformX)}
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
  transformX: (x: number) => number
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
      const angle = angles[joint] || 0;
      const optimal = OPTIMAL_ANGLES[joint] || 0;
      const color = Math.abs(angle - optimal) < TOLERANCE ? "green" : "orange";

      return (
        <Line
          key={index}
          x1={transformX(kpA.x)}
          y1={kpA.y}
          x2={transformX(kpB.x)}
          y2={kpB.y}
          stroke={color}
          strokeWidth={3}
        />
      );
    }
    return null;
  });
};

export default PoseOverlay;
