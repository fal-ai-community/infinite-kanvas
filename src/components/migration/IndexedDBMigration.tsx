"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Database } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { migrateIndexedDBToCloud } from "@/scripts/migrate-indexeddb-to-cloud";

export function IndexedDBMigration() {
  const [migrationState, setMigrationState] = useState<
    "idle" | "checking" | "migrating" | "completed" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    canvases: number;
    images: number;
    errors: string[];
  } | null>(null);
  const [hasLegacyData, setHasLegacyData] = useState<boolean | null>(null);

  const trpcClient = useTRPC();
  const { userId } = useAuth();

  const checkForLegacyData = async () => {
    setMigrationState("checking");
    try {
      const dbExists = await indexedDB
        .databases()
        .then((dbs) => dbs.some((db) => db.name === "infinite-canvas-db"));

      if (!dbExists) {
        setHasLegacyData(false);
        setMigrationState("idle");
        return;
      }

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("infinite-canvas-db", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction(["canvases"], "readonly");
      const store = transaction.objectStore("canvases");
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        setHasLegacyData(count > 0);
        db.close();
        setMigrationState("idle");
      };
    } catch (error) {
      console.error("Error checking for legacy data:", error);
      setHasLegacyData(false);
      setMigrationState("idle");
    }
  };

  const startMigration = async () => {
    if (!userId) {
      alert("Please sign in to migrate your canvases");
      return;
    }

    setMigrationState("migrating");
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const migrationResult = await migrateIndexedDBToCloud(trpcClient, userId);

      clearInterval(progressInterval);
      setProgress(100);

      setResult(migrationResult);
      setMigrationState(
        migrationResult.errors.length > 0 ? "error" : "completed",
      );

      if (migrationResult.errors.length === 0) {
        setHasLegacyData(false);
      }
    } catch (error) {
      console.error("Migration failed:", error);
      setResult({
        canvases: 0,
        images: 0,
        errors: [`Migration failed: ${error}`],
      });
      setMigrationState("error");
    }
  };

  // Check for legacy data on mount
  if (hasLegacyData === null && migrationState === "idle") {
    checkForLegacyData();
  }

  if (hasLegacyData === false && migrationState === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            No Legacy Data Found
          </CardTitle>
          <CardDescription>
            You don't have any canvases stored locally. All your work is already
            in the cloud!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Migrate Local Canvases to Cloud
        </CardTitle>
        <CardDescription>
          {migrationState === "checking" && "Checking for local canvases..."}
          {migrationState === "idle" &&
            hasLegacyData &&
            "We found canvases stored locally. Migrate them to the cloud for better performance and accessibility."}
          {migrationState === "migrating" &&
            "Migrating your canvases to the cloud..."}
          {migrationState === "completed" &&
            "Migration completed successfully!"}
          {migrationState === "error" &&
            "Migration completed with some errors."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {migrationState === "checking" && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {migrationState === "idle" && hasLegacyData && (
          <Button onClick={startMigration} className="w-full">
            Start Migration
          </Button>
        )}

        {migrationState === "migrating" && (
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {progress}% complete
            </p>
          </div>
        )}

        {(migrationState === "completed" || migrationState === "error") &&
          result && (
            <div className="space-y-3">
              {result.canvases > 0 && (
                <Alert type="success" container="bordered">
                  <AlertDescription>
                    Successfully migrated {result.canvases} canvas
                    {result.canvases !== 1 ? "es" : ""} with {result.images}{" "}
                    image{result.images !== 1 ? "s" : ""}.
                  </AlertDescription>
                </Alert>
              )}

              {result.errors.length > 0 && (
                <Alert type="error" container="bordered">
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>Some items could not be migrated:</p>
                      <ul className="list-disc list-inside text-sm">
                        {result.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {result.errors.length > 3 && (
                          <li>...and {result.errors.length - 3} more errors</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                variant="secondary"
                onClick={() => {
                  setMigrationState("idle");
                  setResult(null);
                  checkForLegacyData();
                }}
                className="w-full"
              >
                Check Again
              </Button>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
