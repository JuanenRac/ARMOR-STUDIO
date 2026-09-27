export type AlertLevel = "normal" | "review" | "high";
/** A target as the radar reported it, in the radar's own frame (millimetres); `counted` is false inside an ignore zone. */
export type RadarTarget = { sensor_id: number; track_id: number; x_mm: number; y_mm: number; speed_mm_s: number; counted: boolean };
export type NodeState = { node_id: string; online: boolean; stale?: boolean; timestamp_ms: number; lux: number | null; target_count: number; targets?: RadarTarget[]; alert_level: AlertLevel; /** Where the node's own web panel is, as the node said itself; null until it has. */ panel?: { name: string; firmware: string; ip: string; port: number } | null };
export type SystemState = { mode: "armed" | "disarmed"; revision: number; nodes: Record<string, NodeState>; updated_at: string };
