/**
 * Background sync: pushes offline-queued workouts, nutrition logs and water
 * entries to Supabase when connectivity is restored.
 */
import {
  getPendingWorkouts,
  deletePendingWorkout,
  updateWorkoutSyncStatus,
  getPendingNutritionLogs,
  deletePendingNutritionLog,
  updateNutritionSyncStatus,
  getPendingWaterLogs,
  deletePendingWaterLog,
} from "./db";

export type SyncStatus = "synced" | "pending" | "syncing" | "idle";

export interface SyncResult {
  workoutsSynced: number;
  nutritionSynced: number;
  waterSynced: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Sync workouts
// ---------------------------------------------------------------------------

async function syncWorkouts(userId: string): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingWorkouts(userId);
  const toSync = pending.filter((w) => w.syncStatus === "pending" && w.retryCount < 5);
  let synced = 0;
  let failed = 0;

  for (const workout of toSync) {
    await updateWorkoutSyncStatus(workout.localId, "syncing");
    try {
      const res = await fetch("/api/fitness/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseName: workout.exerciseName,
          exerciseCategory: workout.exerciseCategory,
          durationMinutes: workout.durationMinutes,
          intensity: workout.intensity,
          sets: workout.sets,
          reps: workout.reps,
          weightKg: workout.weightKg,
          distanceKm: workout.distanceKm,
          notes: workout.notes,
          workoutDate: workout.workoutDate,
          dataSource: "offline_sync",
        }),
      });

      if (res.ok) {
        await deletePendingWorkout(workout.localId);
        synced++;
      } else {
        await updateWorkoutSyncStatus(workout.localId, "failed");
        failed++;
      }
    } catch {
      await updateWorkoutSyncStatus(workout.localId, "failed");
      failed++;
    }
  }

  return { synced, failed };
}

// ---------------------------------------------------------------------------
// Sync nutrition logs
// ---------------------------------------------------------------------------

async function syncNutritionLogs(userId: string): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingNutritionLogs(userId);
  const toSync = pending.filter((n) => n.syncStatus === "pending" && n.retryCount < 5);
  let synced = 0;
  let failed = 0;

  for (const log of toSync) {
    await updateNutritionSyncStatus(log.localId, "syncing");
    try {
      const res = await fetch("/api/nutrition/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: log.foodName,
          food_brand: log.foodBrand,
          serving_quantity: log.servingQuantity,
          serving_unit: log.servingUnit,
          meal_category: log.mealCategory,
          logged_date: log.loggedDate,
          nutrient_data: log.nutrientData,
          ragnarok_product_id: log.ragnarokProductId,
        }),
      });

      if (res.ok) {
        await deletePendingNutritionLog(log.localId);
        synced++;
      } else {
        await updateNutritionSyncStatus(log.localId, "failed");
        failed++;
      }
    } catch {
      await updateNutritionSyncStatus(log.localId, "failed");
      failed++;
    }
  }

  return { synced, failed };
}

// ---------------------------------------------------------------------------
// Sync water logs
// ---------------------------------------------------------------------------

async function syncWaterLogs(userId: string): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingWaterLogs(userId);
  const toSync = pending.filter((w) => w.syncStatus === "pending" && w.retryCount < 5);
  let synced = 0;
  let failed = 0;

  for (const log of toSync) {
    try {
      const res = await fetch("/api/nutrition/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ml: log.amountMl }),
      });

      if (res.ok) {
        await deletePendingWaterLog(log.localId);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

// ---------------------------------------------------------------------------
// Main sync entry point
// ---------------------------------------------------------------------------

export async function syncAllPending(userId: string): Promise<SyncResult> {
  const [workoutResult, nutritionResult, waterResult] = await Promise.all([
    syncWorkouts(userId),
    syncNutritionLogs(userId),
    syncWaterLogs(userId),
  ]);

  return {
    workoutsSynced: workoutResult.synced,
    nutritionSynced: nutritionResult.synced,
    waterSynced: waterResult.synced,
    failed: workoutResult.failed + nutritionResult.failed + waterResult.failed,
  };
}

// ---------------------------------------------------------------------------
// Register online listener — auto-sync when connectivity restores
// ---------------------------------------------------------------------------

let syncRegistered = false;

export function registerAutoSync(userId: string, onSync?: (result: SyncResult) => void) {
  if (syncRegistered || typeof window === "undefined") return;
  syncRegistered = true;

  const handleOnline = async () => {
    const result = await syncAllPending(userId);
    if ((result.workoutsSynced + result.nutritionSynced + result.waterSynced) > 0) {
      onSync?.(result);
    }
  };

  window.addEventListener("online", handleOnline);

  // Also try to sync on load if we're already online
  if (navigator.onLine) {
    handleOnline();
  }
}
