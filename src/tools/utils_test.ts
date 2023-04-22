import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { StrictVersion } from "../app.dto.ts";
import { isVersionUpgrade } from "./utils.ts";

Deno.test("check isVersionUpgrade", async (t) => {
  await t.step(
    "should return false when new version is same with old version",
    () => {
      const result1 = isVersionUpgrade("0.0.2", "0.0.2", StrictVersion.Patch);
      const result2 = isVersionUpgrade("0.0.2", "0.0.2", StrictVersion.Minor);
      const result3 = isVersionUpgrade("0.0.2", "0.0.2", StrictVersion.Major);

      assertEquals(result1, false);
      assertEquals(result2, false);
      assertEquals(result3, false);
    },
  );

  await t.step(
    "should return true when new version is a valid patch version",
    () => {
      const result1 = isVersionUpgrade("0.0.2", "0.0.3", StrictVersion.Patch);
      const result2 = isVersionUpgrade("0.0.2", "0.0.4", StrictVersion.Patch);
      const result3 = isVersionUpgrade(
        "1.11.9",
        "1.11.10",
        StrictVersion.Patch,
      );

      assertEquals(result1, true);
      assertEquals(result2, true);
      assertEquals(result3, true);
    },
  );

  await t.step(
    "should return false when new version is not a valid patch version",
    () => {
      const result1 = isVersionUpgrade("0.0.2", "0.0.1", StrictVersion.Patch);
      const result2 = isVersionUpgrade("0.0.2", "0.1.0", StrictVersion.Patch);
      const result3 = isVersionUpgrade("0.0.2", "1.0.0", StrictVersion.Patch);
      const result4 = isVersionUpgrade(
        "1.11.10",
        "1.11.9",
        StrictVersion.Patch,
      );

      assertEquals(result1, false);
      assertEquals(result2, false);
      assertEquals(result3, false);
      assertEquals(result4, false);
    },
  );

  await t.step(
    "should return true when new version is a valid minor version",
    () => {
      const result1 = isVersionUpgrade("0.0.2", "0.0.3", StrictVersion.Minor);
      const result2 = isVersionUpgrade("0.0.2", "0.0.4", StrictVersion.Minor);
      const result3 = isVersionUpgrade("0.0.2", "0.1.0", StrictVersion.Minor);
      const result4 = isVersionUpgrade("0.0.2", "0.1.1", StrictVersion.Minor);
      const result5 = isVersionUpgrade("0.0.2", "0.2.0", StrictVersion.Minor);
      const result6 = isVersionUpgrade(
        "1.11.9",
        "1.11.10",
        StrictVersion.Minor,
      );
      const result7 = isVersionUpgrade(
        "1.11.9",
        "1.12.0",
        StrictVersion.Minor,
      );

      assertEquals(result1, true);
      assertEquals(result2, true);
      assertEquals(result3, true);
      assertEquals(result4, true);
      assertEquals(result5, true);
      assertEquals(result6, true);
      assertEquals(result7, true);
    },
  );

  await t.step(
    "should return false when new version is not a valid minor version",
    () => {
      const result1 = isVersionUpgrade("0.0.2", "0.0.1", StrictVersion.Minor);
      const result2 = isVersionUpgrade("0.0.2", "1.0.0", StrictVersion.Minor);

      assertEquals(result1, false);
      assertEquals(result2, false);
    },
  );

  await t.step(
    "should return true when new version is a valid major version",
    () => {
      const result1 = isVersionUpgrade("0.0.2", "0.0.3", StrictVersion.Major);
      const result2 = isVersionUpgrade("0.0.2", "0.0.4", StrictVersion.Major);
      const result3 = isVersionUpgrade("0.0.2", "0.1.0", StrictVersion.Major);
      const result4 = isVersionUpgrade("0.0.2", "0.1.1", StrictVersion.Major);
      const result5 = isVersionUpgrade("0.0.2", "0.2.0", StrictVersion.Major);
      const result6 = isVersionUpgrade("0.0.2", "1.0.0", StrictVersion.Major);
      const result7 = isVersionUpgrade("0.0.2", "2.0.0", StrictVersion.Major);
      const result8 = isVersionUpgrade(
        "1.11.9",
        "1.11.10",
        StrictVersion.Major,
      );
      const result9 = isVersionUpgrade(
        "1.11.9",
        "1.12.0",
        StrictVersion.Major,
      );
      const result10 = isVersionUpgrade(
        "1.11.9",
        "2.0.0",
        StrictVersion.Major,
      );

      assertEquals(result1, true);
      assertEquals(result2, true);
      assertEquals(result3, true);
      assertEquals(result4, true);
      assertEquals(result5, true);
      assertEquals(result6, true);
      assertEquals(result7, true);
      assertEquals(result8, true);
      assertEquals(result9, true);
      assertEquals(result10, true);
    },
  );

  await t.step(
    "should return false when new version is not a valid major version",
    () => {
      const result1 = isVersionUpgrade("0.0.2", "0.0.1", StrictVersion.Major);
      const result2 = isVersionUpgrade(
        "1.11.10",
        "1.11.9",
        StrictVersion.Major,
      );
      const result3 = isVersionUpgrade(
        "1.11.10",
        "0.11.10",
        StrictVersion.Major,
      );
      const result4 = isVersionUpgrade(
        "1.11.10",
        "1.10.10",
        StrictVersion.Major,
      );

      assertEquals(result1, false);
      assertEquals(result2, false);
      assertEquals(result3, false);
      assertEquals(result4, false);
    },
  );

  await t.step("should throw an error when upgradeType is invalid", () => {
    assertThrows(
      () => {
        isVersionUpgrade("0.0.2", "0.0.3", StrictVersion.None);
      },
      Error,
      "Invalid upgrade type",
    );
  });
});
