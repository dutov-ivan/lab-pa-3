import React from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";

type Player = "X" | "O" | " ";
const CUBE_SIZE = 0.9; // keep same cube size as in App

export default function Cell({
  position,
  value,
  onClick,
  isWinning,
}: {
  position: [number, number, number];
  value: Player;
  onClick: () => void;
  isWinning?: boolean;
}) {
  const meshRef = React.useRef<THREE.Mesh | null>(null);
  const [hovered, setHovered] = React.useState(false);

  const textOffset = CUBE_SIZE / 2 + 0.01; // Position text slightly off the face

  return (
    <group position={position}>
      {/* Invisible larger mesh to improve touch hit area on mobile. This captures clicks/touches.
          It also proxies hover state to the visible cube. */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry
          args={[CUBE_SIZE + 0.4, CUBE_SIZE + 0.4, CUBE_SIZE + 0.4]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Visible cube (visual only) */}
      <mesh ref={meshRef} scale={hovered ? 1.05 : 1} castShadow receiveShadow>
        <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
        <meshStandardMaterial
          transparent={true}
          // semi-transparent when the cell is empty (value === " "), opaque otherwise
          opacity={value === " " ? 0.25 : 1}
          // disable depthWrite for transparent cubes to avoid rendering artifacts
          depthWrite={value === " " ? false : true}
          metalness={0.2}
          roughness={0.2}
          color={isWinning ? "#4ade80" : hovered ? "#b3d4ff" : "#97a6b3"}
        />
      </mesh>

      {/* Text rendering on faces */}
      {value !== " " && (
        <>
          <Text
            position={[0, 0, textOffset]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          <Text
            position={[0, 0, -textOffset]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          <Text
            position={[textOffset, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          <Text
            position={[-textOffset, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          <Text
            position={[0, textOffset, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
          <Text
            position={[0, -textOffset, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            fontSize={0.45}
            anchorX="center"
            anchorY="middle"
          >
            {value}
          </Text>
        </>
      )}
    </group>
  );
}
