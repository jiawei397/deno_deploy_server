// deno-lint-ignore-file no-explicit-any
import { BadRequestException } from "oak_exception";
import { assert, assertEquals, assertThrows } from "std/testing/asserts.ts";
import { StrictVersion, UpgradeDto } from "./app.dto.ts";
import { AppService, DeployType, FileOptions } from "./app.service.ts";

Deno.test("checkVersion", async (t) => {
  const logger: any = console;
  const appService = new AppService(logger);

  await t.step(
    "should throw an error when version is same in strict_version",
    () => {
      assertThrows(
        () => {
          const strict_version = StrictVersion.Patch;
          const hostname = "wiki.uino.com";
          const fileOptions: FileOptions = {
            file_path: "/app/deployments/app1.yaml",
            file_type: DeployType.Deployment,
            content: "apiVersion: apps/v1\n...\n",
            currentVersion: "0.0.1",
            upgradeVersion: "0.0.1",
            unchanged: true,
          };
          appService.checkVersion(fileOptions, strict_version, hostname);
        },
        BadRequestException,
        "Target version same with currently running version",
      );
    },
  );

  await t.step(
    "should throw an error when version is invalid",
    () => {
      assertThrows(
        () => {
          const strict_version = StrictVersion.Patch;
          const hostname = "wiki.uino.com";
          const fileOptions: FileOptions = {
            file_path: "/app/deployments/app1.yaml",
            file_type: DeployType.Deployment,
            content: "apiVersion: apps/v1\n...\n",
            currentVersion: "0.0.1",
            upgradeVersion: "v0.0.2",
            unchanged: false,
          };
          appService.checkVersion(fileOptions, strict_version, hostname);
        },
        BadRequestException,
        "Invalid version",
      );
    },
  );

  await t.step(
    "should throw an error when hostname is invalid in content",
    () => {
      assertThrows(
        () => {
          const strict_version = StrictVersion.Patch;
          const hostname = "wiki.uino.com";
          const fileOptions: FileOptions = {
            file_path: "/app/deployments/app1.yaml",
            file_type: DeployType.Deployment,
            content: "apiVersion: apps/v1\n...\n",
            currentVersion: "0.0.1",
            upgradeVersion: "1.1.0",
            unchanged: false,
          };
          appService.checkVersion(fileOptions, strict_version, hostname);
        },
        BadRequestException,
        "Hostname not match",
      );
    },
  );

  await t.step(
    "should throw an error when version is invalid",
    () => {
      assertThrows(
        () => {
          const strict_version = StrictVersion.Patch;
          const hostname = "wiki.uino.com";
          const fileOptions: FileOptions = {
            file_path: "/app/deployments/app1.yaml",
            file_type: DeployType.Deployment,
            content:
              "host: wiki.uino.com \n image: dk.uino.cn/kiss/wiki-web:0.0.1",
            currentVersion: "0.0.1",
            upgradeVersion: "1.1.0",
            unchanged: false,
          };
          appService.checkVersion(fileOptions, strict_version, hostname);
        },
        BadRequestException,
        "Strict version skip, from 0.0.1 to 1.1.0",
      );
    },
  );

  await t.step(
    "should not check version when strict_version is skip",
    () => {
      const strict_version = StrictVersion.None;
      const hostname = "wiki.uino.com";
      const fileOptions: FileOptions = {
        file_path: "/app/deployments/app1.yaml",
        file_type: DeployType.Deployment,
        content: "host: wiki.uino.com \n image: dk.uino.cn/kiss/wiki-web:0.0.1",
        currentVersion: "0.0.1",
        upgradeVersion: "1.1.0",
        unchanged: false,
      };
      appService.checkVersion(fileOptions, strict_version, hostname);
      assert(true, "will not throw");
    },
  );
});

Deno.test("getNewContentByVersion", async (t) => {
  const logger: any = console;
  const appService = new AppService(logger);

  const upgrade: UpgradeDto = {
    "project": "project",
    "repository": "repository",
    "hostname": "wiki.uino.com",
    "strict_version": StrictVersion.Patch,
    "version": "1.0.0",
    "is_local": true,
    "timeout": 2,
  };

  await t.step("when content includes the version string", () => {
    const content = "image: dk.uino.cn/project/repository:0.0.1 \n other";
    const expectedNewContent =
      "image: dk.uino.cn/project/repository:1.0.0 \n other";
    const newContent = appService.getNewContentByVersion(upgrade, content);
    assertEquals(newContent, expectedNewContent);
  });

  await t.step("when content includes the version string without space", () => {
    const content = "image:dk.uino.cn/project/repository:0.0.1\n other";
    const expectedNewContent =
      "image:dk.uino.cn/project/repository:1.0.0\n other";
    const newContent = appService.getNewContentByVersion(upgrade, content);
    assertEquals(newContent, expectedNewContent);
  });

  await t.step("when content doesn't include the version string", () => {
    const invalidContent = "invalid content";
    const newContent = appService.getNewContentByVersion(
      upgrade,
      invalidContent,
    );
    assertEquals(newContent, invalidContent);
  });
});
