import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

type Player = "X" | "O" | " ";

const SIZE = 4;
const CUBE_SIZE = 0.9; // actual cube size (slightly smaller to create gaps)
const SPACING = 1.4; // distance between cube centers

const initializeBoard = (): Player[][][] => {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => " " as Player))
  );
};

export default function App() {
  const [board, setBoard] = React.useState<Player[][][]>(initializeBoard);
  const [currentPlayer, setCurrentPlayer] = React.useState<Player>("X");

  const handleClick = (z: number, y: number, x: number) => {
    // If the cell is already taken, do nothing.
    if (board[z][y][x] !== " ") {
      return;
    }

    // Create a new board state with the updated cell.
    const newBoard = board.map((layer, lz) =>
      layer.map((row, ly) =>
        row.map((cell, lx) => {
          if (lz === z && ly === y && lx === x) {
            return currentPlayer;
          }
          return cell;
        })
      )
    );
    setBoard(newBoard);

    // Toggle the current player for the next turn.
    setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
  };

  // center offset so the cube cluster is centered at origin
  const centerOffset = ((SIZE - 1) * SPACING) / 2;

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [6, 6, 6], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        <OrbitControls enablePan enableZoom enableRotate />

        <group>
          {board.map((layer, z) =>
            layer.map((row, y) =>
              row.map((cell, x) => {
                const posX = x * SPACING - centerOffset;
                const posY = y * SPACING - centerOffset;
                const posZ = z * SPACING - centerOffset;
                return (
                  <Cell
                    key={`${z}-${y}-${x}`}
                    position={[posX, posY, posZ]}
                    value={cell}
                    onClick={() => handleClick(z, y, x)}
                  />
                );
              })
            )
          )}
        </group>
      </Canvas>
    </div>
  );
}

function Cell({
  position,
  value,
  onClick,
}: {
  position: [number, number, number];
  value: Player;
  onClick: () => void;
}) {
  const meshRef = React.useRef<THREE.Mesh | null>(null);
  const [hovered, setHovered] = React.useState(false);
  
  const textOffset = CUBE_SIZE / 2 + 0.01; // Position text slightly off the face

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={hovered ? 1.05 : 1}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
        onPointerDown={(e) => {
          // stop propagation to prevent OrbitControls from taking the event while clicking
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
        <meshStandardMaterial
          transparent
          opacity={1}
          metalness={0.2}
          roughness={0.2}
          color={hovered ? "#b3d4ff" : "#97a6b3"}
        />
      </mesh>

      {/* --- MODIFIED: Text rendering --- */}
      {/* A Text component is now rendered on each of the 6 faces of the cube. */}
      {value !== " " && (
        <>
          {/* Front Face */}
          <Text position={[0, 0, textOffset]} fontSize={0.45} anchorX="center" anchorY="middle">
            {value}
          </Text>
          {/* Back Face */}
          <Text position={[0, 0, -textOffset]} rotation={[0, Math.PI, 0]} fontSize={0.45} anchorX="center" anchorY="middle">
            {value}
          </Text>
          {/* Right Face */}
          <Text position={[textOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.45} anchorX="center" anchorY="middle">
            {value}
          </Text>
          {/* Left Face */}
          <Text position={[-textOffset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={0.45} anchorX="center" anchorY="middle">
            {value}
          </Text>
          {/* Top Face */}
          <Text position={[0, textOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.45} anchorX="center" anchorY="middle">
            {value}
          </Text>
          {/* Bottom Face */}
          <Text position={[0, -textOffset, 0]} rotation={[Math.PI / 2, 0, 0]} fontSize={0.45} anchorX="center" anchorY="middle">
            {value}
          </Text>
        </>
      )}
    </group>
  );
}
