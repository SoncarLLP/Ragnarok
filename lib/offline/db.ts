/**
 * Ragnarök offline IndexedDB schema and helpers using `idb`.
 * Stores pending workout logs, nutrition diary entries, and water logs
 * so members can train and eat without internet connectivity.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingWorkout {
  localId: string;          // UUID generated client-side
  userId: string;
  exerciseName: string;
  exerciseCategory: string;
  durationMinutes: number;
  intensity: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  distanceKm?: number;
  notes?: string;
  workoutDate: string;      // ISO string
  createdAt: string;        // ISO string
  syncStatus: "pending" | "syncing" | "failed";
  retryCount: number;
}

export interface PendingNutritionLog {
  localId: string;
  userId: string;
  foodName: string;
  foodBrand?: string;
  servingQuantity: number;
  servingUnit: string;
  mealCategory: string;
  loggedDate: string;
  nutrientData: Record<string, number>;
  ragnarokProductId?: string;
  createdAt: string;
  syncStatus: "pending" | "syncing" | "failed";
  retryCount: number;
}

export interface PendingWaterLog {
  localId: string;
  userId: string;
  amountMl: number;
  loggedDate: string;
  createdAt: string;
  syncStatus: "pending" | "syncing" | "failed";
  retryCount: number;
}

export interface CachedFood {
  id: string;               // USDA or UK library ID
  name: string;
  brand?: string;
  nutrientData: Record<string, number>;
  cachedAt: string;
}

// ---------------------------------------------------------------------------
// DB Schema
// ---------------------------------------------------------------------------

interface RagnarokOfflineDB extends DBSchema {
  pendingWorkouts: {
    key: string;
    value: PendingWorkout;
    indexes: { "by-userId": string; "by-syncStatus": string };
  };
  pendingNutritionLogs: {
    key: string;
    value: PendingNutritionLog;
    indexes: { "by-userId": string; "by-syncStatus": string };
  };
  pendingWaterLogs: {
    key: string;
    value: PendingWaterLog;
    indexes: { "by-userId": string; "by-syncStatus": string };
  };
  cachedFoods: {
    key: string;
    value: CachedFood;
    indexes: { "by-name": string };
  };
}

// ---------------------------------------------------------------------------
// DB singleton
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBPDatabase<RagnarokOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<RagnarokOfflineDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB<RagnarokOfflineDB>("ragnarok-offline", 1, {
      upgrade(db) {
        // Pending workouts
        const workoutStore = db.createObjectStore("pendingWorkouts", { keyPath: "localId" });
        workoutStore.createIndex("by-userId", "userId");
        workoutStore.createIndex("by-syncStatus", "syncStatus");

        // Pending nutrition logs
        const nutStore = db.createObjectStore("pendingNutritionLogs", { keyPath: "localId" });
        nutStore.createIndex("by-userId", "userId");
        nutStore.createIndex("by-syncStatus", "syncStatus");

        // Pending water logs
        const waterStore = db.createObjectStore("pendingWaterLogs", { keyPath: "localId" });
        waterStore.createIndex("by-userId", "userId");
        waterStore.createIndex("by-syncStatus", "syncStatus");

        // Cached foods (searched / viewed foods stored for offline access)
        const foodStore = db.createObjectStore("cachedFoods", { keyPath: "id" });
        foodStore.createIndex("by-name", "name");
      },
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Workout helpers
// ---------------------------------------------------------------------------

export async function addPendingWorkout(workout: Omit<PendingWorkout, "localId" | "createdAt" | "syncStatus" | "retryCount">): Promise<string> {
  const db = await getOfflineDB();
  const localId = crypto.randomUUID();
  const entry: PendingWorkout = {
    ...workout,
    localId,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    retryCount: 0,
  };
  await db.put("pendingWorkouts", entry);
  return localId;
}

export async function getPendingWorkouts(userId: string): Promise<PendingWorkout[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex("pendingWorkouts", "by-userId", userId);
}

export async function deletePendingWorkout(localId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("pendingWorkouts", localId);
}

export async function updateWorkoutSyncStatus(localId: string, status: PendingWorkout["syncStatus"]): Promise<void> {
  const db = await getOfflineDB();
  const item = await db.get("pendingWorkouts", localId);
  if (!item) return;
  await db.put("pendingWorkouts", {
    ...item,
    syncStatus: status,
    retryCount: status === "failed" ? item.retryCount + 1 : item.retryCount,
  });
}

// ---------------------------------------------------------------------------
// Nutrition helpers
// ---------------------------------------------------------------------------

export async function addPendingNutritionLog(log: Omit<PendingNutritionLog, "localId" | "createdAt" | "syncStatus" | "retryCount">): Promise<string> {
  const db = await getOfflineDB();
  const localId = crypto.randomUUID();
  const entry: PendingNutritionLog = {
    ...log,
    localId,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    retryCount: 0,
  };
  await db.put("pendingNutritionLogs", entry);
  return localId;
}

export async function getPendingNutritionLogs(userId: string): Promise<PendingNutritionLog[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex("pendingNutritionLogs", "by-userId", userId);
}

export async function deletePendingNutritionLog(localId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("pendingNutritionLogs", localId);
}

export async function updateNutritionSyncStatus(localId: string, status: PendingNutritionLog["syncStatus"]): Promise<void> {
  const db = await getOfflineDB();
  const item = await db.get("pendingNutritionLogs", localId);
  if (!item) return;
  await db.put("pendingNutritionLogs", {
    ...item,
    syncStatus: status,
    retryCount: status === "failed" ? item.retryCount + 1 : item.retryCount,
  });
}

// ---------------------------------------------------------------------------
// Water helpers
// ---------------------------------------------------------------------------

export async function addPendingWaterLog(log: Omit<PendingWaterLog, "localId" | "createdAt" | "syncStatus" | "retryCount">): Promise<string> {
  const db = await getOfflineDB();
  const localId = crypto.randomUUID();
  const entry: PendingWaterLog = {
    ...log,
    localId,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
    retryCount: 0,
  };
  await db.put("pendingWaterLogs", entry);
  return localId;
}

export async function getPendingWaterLogs(userId: string): Promise<PendingWaterLog[]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex("pendingWaterLogs", "by-userId", userId);
}

export async function deletePendingWaterLog(localId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("pendingWaterLogs", localId);
}

// ---------------------------------------------------------------------------
// Food cache helpers
// ---------------------------------------------------------------------------

export async function cacheFoods(foods: CachedFood[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction("cachedFoods", "readwrite");
  await Promise.all(foods.map((f) => tx.store.put(f)));
  await tx.done;
}

export async function getCachedFoodsByName(query: string): Promise<CachedFood[]> {
  const db = await getOfflineDB();
  const all = await db.getAll("cachedFoods");
  const q = query.toLowerCase();
  return all.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 20);
}

// ---------------------------------------------------------------------------
// Count pending items (for sync status badge)
// ---------------------------------------------------------------------------

export async function countPendingItems(userId: string): Promise<number> {
  try {
    const db = await getOfflineDB();
    const [workouts, nutrition, water] = await Promise.all([
      db.getAllFromIndex("pendingWorkouts", "by-userId", userId),
      db.getAllFromIndex("pendingNutritionLogs", "by-userId", userId),
      db.getAllFromIndex("pendingWaterLogs", "by-userId", userId),
    ]);
    return (
      workouts.filter((w) => w.syncStatus === "pending").length +
      nutrition.filter((n) => n.syncStatus === "pending").length +
      water.filter((w) => w.syncStatus === "pending").length
    );
  } catch {
    return 0;
  }
}
