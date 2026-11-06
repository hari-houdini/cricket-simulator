"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { STAGE_PALETTE } from "../../shared/const/stage-palette.const";
import {
  ringPoint,
  stageCameraDistanceFor,
  stageRadiusFor,
} from "../../shared/utils/stage-layout";
import { styles } from "./FranchiseStage.styles";
import type { StageSlot } from "./FranchiseStage.types";

/** The props for {@link FranchiseStage}. */
type FranchiseStageProps = {
  /** One slot per franchise, in ring order. Keep the array stable between polls. */
  readonly slots: readonly StageSlot[];
};

/** How high each state lifts its plinth, in scene units. */
const LIFT = { free: 0, taken: 0.25, mine: 0.5 } as const;

/** How bright each state glows, as the material's emissive intensity. */
const GLOW = { free: 0.12, taken: 0.4, mine: 1.1 } as const;

/**
 * How high the camera stands above the pitch. Set above the ring so the plinths
 * read as a turntable from the front, with the whole ring in frame.
 */
const CAMERA_HEIGHT = 5.4;

/** The props for {@link Plinth}. */
type PlinthProps = {
  /** The plinth's place on the ring, in radians. */
  readonly angle: number;
  /** The plinth's X position on the ground plane. */
  readonly x: number;
  /** The plinth's Z position on the ground plane. */
  readonly z: number;
  /** The franchise's team colour. */
  readonly color: string;
  /** The franchise's state in the lobby. */
  readonly state: StageSlot["state"];
  /** True when the viewer prefers reduced motion: positions snap, nothing bobs. */
  readonly reduceMotion: boolean;
};

/**
 * One franchise on the ring: a team-coloured plinth with a crown. Its lift and glow
 * ease toward the state's target each frame, so a claim rises rather than jumps. A
 * free plinth bobs gently out of phase with its neighbours.
 *
 * @param props - The plinth's place, colour, state and motion preference.
 * @returns The plinth mesh group.
 */
function Plinth({ angle, x, z, color, state, reduceMotion }: PlinthProps) {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame((frame) => {
    const group = groupRef.current;
    const body = bodyRef.current;
    const material = materialRef.current;
    if (!group || !body || !material) {
      return;
    }
    const lift = LIFT[state];
    const glow = GLOW[state];
    const bob =
      !reduceMotion && state === "free"
        ? Math.sin(frame.clock.elapsedTime * 2 + angle) * 0.06
        : 0;
    if (reduceMotion) {
      group.position.y = lift;
      material.emissiveIntensity = glow;
      return;
    }
    group.position.y += (lift + bob - group.position.y) * 0.08;
    material.emissiveIntensity += (glow - material.emissiveIntensity) * 0.1;
    body.rotation.y += 0.004;
  });

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <mesh ref={bodyRef}>
        <cylinderGeometry args={[0.55, 0.64, 0.5, 48]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={GLOW[state]}
          metalness={0.35}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.27, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.05, 12, 48]} />
        <meshStandardMaterial
          color={STAGE_PALETTE.chalk}
          emissive={STAGE_PALETTE.ochre}
          emissiveIntensity={state === "mine" ? 0.9 : 0.15}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

/**
 * The ring of plinths, slowly turning. It also keeps the camera framed for the
 * stage's width and asks for a frame whenever the franchise states change, so a
 * stage that is not animating still redraws when a claim lands.
 *
 * @param props - The slots and the stage's width and motion preference.
 * @returns The scene: lights, pitch, ring of plinths.
 */
function Scene({
  slots,
  width,
  reduceMotion,
}: FranchiseStageProps & {
  readonly width: number;
  readonly reduceMotion: boolean;
}) {
  const ringRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const radius = stageRadiusFor(width);
  const distance = stageCameraDistanceFor(width);

  useEffect(() => {
    camera.position.set(0, CAMERA_HEIGHT, distance);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, distance, invalidate]);

  // A stage that is not animating (reduced motion, or scrolled out of view) draws
  // only when asked, so a changed claim asks for a frame here.
  useEffect(() => {
    if (slots.length > 0) {
      invalidate();
    }
  }, [slots, invalidate]);

  useFrame((frame) => {
    const ring = ringRef.current;
    if (!ring || reduceMotion) {
      return;
    }
    ring.rotation.y = frame.clock.elapsedTime * 0.06;
  });

  return (
    <>
      <ambientLight intensity={0.8} color={STAGE_PALETTE.chalk} />
      <spotLight
        position={[0, 9, 2]}
        angle={0.7}
        penumbra={0.9}
        intensity={70}
        color={STAGE_PALETTE.ochreBright}
      />
      <pointLight
        position={[-4, 2, 4]}
        intensity={6}
        color={STAGE_PALETTE.ochre}
      />
      <pointLight
        position={[4, 2, -3]}
        intensity={5}
        color={STAGE_PALETTE.chalk}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <circleGeometry args={[4.1, 72]} />
        <meshStandardMaterial color={STAGE_PALETTE.turfDeep} roughness={0.85} />
      </mesh>
      <group ref={ringRef}>
        {slots.map((slot, index) => {
          const point = ringPoint(index, slots.length, radius);
          return (
            <Plinth
              key={slot.id}
              angle={point.angle}
              x={point.x}
              z={point.z}
              color={slot.color}
              state={slot.state}
              reduceMotion={reduceMotion}
            />
          );
        })}
      </group>
    </>
  );
}

/**
 * The 3D franchise stage: the ten franchises as plinths on a turning ring, lifted
 * and lit by their state in the lobby. It is decorative, because the franchise
 * cards beside it are the controls and carry the same information in words. The
 * canvas is hidden from assistive technology and ignores the pointer.
 *
 * It is loaded on the client only (`ssr: false`), since WebGL has no server. It
 * stops animating when it scrolls out of view, and it holds still for viewers who
 * prefer reduced motion.
 *
 * @param props.slots - One slot per franchise, in ring order.
 * @returns The stage frame with its canvas.
 */
export function FranchiseStage({ slots }: FranchiseStageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const resize = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    resize.observe(frame);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const watch = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setVisible(entry.isIntersecting);
      }
    });
    watch.observe(frame);
    return () => watch.disconnect();
  }, []);

  return (
    <div ref={frameRef} aria-hidden="true" {...stylex.props(styles.frame)}>
      <Canvas
        {...stylex.props(styles.canvas)}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{
          position: [0, CAMERA_HEIGHT, stageCameraDistanceFor(width)],
          fov: 34,
        }}
        frameloop={reduceMotion || !visible ? "demand" : "always"}
      >
        <Scene slots={slots} width={width} reduceMotion={reduceMotion} />
      </Canvas>
    </div>
  );
}
