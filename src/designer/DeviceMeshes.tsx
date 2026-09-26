/**
 * The 3D bodies of the devices placed in the design: a smoke detector on the ceiling, a door contact on its frame, a plug, a bulb, a siren.
 * Each shows its live state: a triggered alarm sensor glows and pulses red, a light or plug that is on glows warm, a device that is offline is grey.
 * Every device is drawn at its own origin, its back to the surface it is fixed to.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { StudioDevice } from "../api";
import { deviceProblem, KIND_COLOUR, MAIN_FIELD } from "../deviceKinds";

const WHITE = "#e8eef0";

function Body({ device, glow }: { device: StudioDevice; glow: string }) {
  const kind = device.kind, colour = KIND_COLOUR[kind], on = device.state.on === true;
  const body = <meshStandardMaterial color={device.online ? WHITE : "#7d8a90"} roughness={0.5} emissive={glow} emissiveIntensity={glow === "#000000" ? 0 : 0.9} />;
  switch (kind) {
    case "smoke": case "co": case "gas":
      return <group><mesh castShadow><cylinderGeometry args={[0.055, 0.06, 0.04, 20]} />{body}</mesh><mesh position={[0, -0.025, 0]}><cylinderGeometry args={[0.02, 0.02, 0.012, 12]} /><meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.6} /></mesh></group>;
    case "door": case "window":
      return <group><mesh castShadow><boxGeometry args={[0.07, 0.025, 0.02]} />{body}</mesh><mesh position={[0.075, 0, 0]}><boxGeometry args={[0.03, 0.02, 0.016]} />{body}</mesh></group>;
    case "motion": case "glass_break": case "vibration":
      return <group><mesh castShadow><boxGeometry args={[0.06, 0.08, 0.035]} />{body}</mesh><mesh position={[0, 0.005, 0.022]}><sphereGeometry args={[0.028, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.5} transparent opacity={0.85} /></mesh></group>;
    case "water_leak":
      return <mesh castShadow><cylinderGeometry args={[0.035, 0.035, 0.014, 16]} />{body}</mesh>;
    case "panic_button":
      return <group><mesh castShadow><boxGeometry args={[0.09, 0.09, 0.03]} />{body}</mesh><mesh position={[0, 0, 0.02]}><cylinderGeometry args={[0.028, 0.028, 0.016, 16]} /><meshStandardMaterial color="#ff4d5e" emissive="#ff4d5e" emissiveIntensity={0.7} /></mesh></group>;
    case "climate": case "temperature": case "humidity": case "light_level":
      return <group><mesh castShadow><boxGeometry args={[0.06, 0.06, 0.02]} />{body}</mesh><mesh position={[0, 0.005, 0.011]}><planeGeometry args={[0.035, 0.03]} /><meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.7} /></mesh></group>;
    case "smart_plug":
      return <group><mesh castShadow><boxGeometry args={[0.07, 0.07, 0.04]} />{body}</mesh>{[-0.012, 0.012].map(x => <mesh key={x} position={[x, 0, 0.024]}><boxGeometry args={[0.006, 0.02, 0.008]} /><meshStandardMaterial color="#333" /></mesh>)}
        <mesh position={[0, 0.03, 0.022]}><sphereGeometry args={[0.006, 8, 8]} /><meshStandardMaterial color={on ? "#34d399" : "#556"} emissive={on ? "#34d399" : "#000000"} emissiveIntensity={on ? 1.4 : 0} /></mesh></group>;
    case "smart_light":
      return <group><mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.06, 12]} />{body}</mesh><mesh position={[0, -0.03, 0]} castShadow><sphereGeometry args={[0.06, 18, 14]} /><meshStandardMaterial color={on ? "#ffe9a8" : "#dde3e5"} emissive={on ? "#ffd36b" : "#000000"} emissiveIntensity={on ? 1.6 : 0} transparent opacity={0.92} /></mesh></group>;
    case "smart_switch":
      return <group><mesh castShadow><boxGeometry args={[0.08, 0.08, 0.015]} />{body}</mesh><mesh position={[0, on ? 0.012 : -0.012, 0.011]}><boxGeometry args={[0.02, 0.03, 0.008]} /><meshStandardMaterial color={on ? "#4ade80" : "#889"} emissive={on ? "#4ade80" : "#000000"} emissiveIntensity={on ? 0.8 : 0} /></mesh></group>;
    case "siren":
      return <group><mesh castShadow><boxGeometry args={[0.16, 0.2, 0.08]} />{body}</mesh><mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.07, 0.08, 16, 1, true]} /><meshStandardMaterial color={on ? "#ff4d5e" : "#556"} emissive={on ? "#ff4d5e" : "#000000"} emissiveIntensity={on ? 1.6 : 0} side={THREE.DoubleSide} /></mesh></group>;
    case "lock":
      return <group><mesh castShadow><boxGeometry args={[0.05, 0.16, 0.035]} />{body}</mesh><mesh position={[0, 0.02, 0.022]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.022, 0.01, 14]} /><meshStandardMaterial color={device.state.locked === true ? "#34d399" : "#ffb020"} emissive={device.state.locked === true ? "#34d399" : "#ffb020"} emissiveIntensity={0.7} /></mesh></group>;
    case "valve":
      return <group><mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.16, 12]} />{body}</mesh><mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.012, 0.012, 0.08, 8]} />{body}</mesh><mesh position={[0, 0.11, 0]}><boxGeometry args={[0.08, 0.016, 0.016]} /><meshStandardMaterial color={device.state.open === true ? "#34d399" : "#ff4d5e"} /></mesh></group>;
    default: return <mesh castShadow><boxGeometry args={[0.06, 0.06, 0.03]} />{body}</mesh>;
  }
}

/** A device in the scene: its body, a halo that pulses while it is in alarm, and a name tag when it is selected. */
export function DeviceView({ device, selected, hover, hooks, z, x, y, rotation, pitch, roll }: {
  device: StudioDevice; selected: boolean; hover: boolean; hooks: Record<string, unknown>; x: number; y: number; z: number; rotation: number; pitch: number; roll: number;
}) {
  const problem = deviceProblem(device), alarm = problem === "triggered" || problem === "tamper";
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (halo.current) { const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 6); halo.current.scale.setScalar(1 + pulse * 0.9); (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + pulse * 0.28; } });
  const glow = alarm ? "#ff4d5e" : selected ? "#00e5ff" : hover ? "#0c4552" : "#000000";
  const main = MAIN_FIELD[device.kind], lit = main ? device.state[main] === true : false;
  return <group position={[x, z, -y]} rotation={[pitch * Math.PI / 180, rotation * Math.PI / 180, roll * Math.PI / 180, "XZY"]} {...hooks}>
    <Body device={device} glow={glow} />
    {alarm && <mesh ref={halo} raycast={() => null}><sphereGeometry args={[0.16, 16, 12]} /><meshBasicMaterial color="#ff4d5e" transparent opacity={0.3} depthWrite={false} /></mesh>}
    {!alarm && lit && (device.kind === "smart_light" || device.kind === "smart_plug") && <mesh raycast={() => null}><sphereGeometry args={[0.22, 14, 10]} /><meshBasicMaterial color="#ffd36b" transparent opacity={0.12} depthWrite={false} /></mesh>}
    {selected && <mesh raycast={() => null} rotation={[-Math.PI / 2, 0, 0]} position={[0, -z + 0.02, 0]}><ringGeometry args={[0.15, 0.19, 32]} /><meshBasicMaterial color="#00e5ff" /></mesh>}
  </group>;
}
