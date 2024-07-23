import React, { useRef, useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Canvas from "react-native-canvas";

interface CanvasProps {
  style?: ViewStyle;
  onCanvasReady?: (canvas: Canvas) => void;
}

const CustomCanvas: React.FC<CanvasProps> = ({ style, onCanvasReady }) => {
  const canvasRef = useRef<Canvas>(null);

  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [canvasRef.current, onCanvasReady]);

  return (
    <View style={style}>
      <Canvas ref={canvasRef} />
    </View>
  );
};

export default CustomCanvas;
