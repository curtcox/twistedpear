// @ts-nocheck
import type { DriveManager } from "@twistedpear/bridge-hyper";
import type { SeederState } from "./register.js";

export async function attachSeederDrives(driveManager: DriveManager, state: SeederState): Promise<void> {
  for (const drive of state.drives) {
    await driveManager.openDrive(drive.driveKey, { serve: true });
    console.log(
      `seeder: attached drive ${drive.driveKey} (${Object.keys(drive.versions).length} version(s))`
    );
  }
}
