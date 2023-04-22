import { YamlLoader } from "yaml_loader";
import { StrictVersion } from "../app.dto.ts";

export async function readYaml<T>(path: string): Promise<T> {
  let allPath = path;
  if (!/\.(yaml|yml)$/.test(path)) {
    allPath += ".yaml";
  }
  const yamlLoader = new YamlLoader();
  const data = await yamlLoader.parseFile(allPath);
  return data as T;
}

export function isVersionUpgrade(
  oldVersion: string,
  newVersion: string,
  upgradeType: StrictVersion,
) {
  if (oldVersion === newVersion) {
    return false;
  }
  const oldVerArr = oldVersion.split(".").map((v) => parseInt(v));
  const newVerArr = newVersion.split(".").map((v) => parseInt(v));

  switch (upgradeType) {
    case "patch":
      if (newVerArr[0] !== oldVerArr[0] || newVerArr[1] !== oldVerArr[1]) {
        return false;
      }
      return newVerArr[2] > oldVerArr[2];
    case "minor":
      if (newVerArr[0] !== oldVerArr[0]) {
        return false;
      }
      if (newVerArr[1] > oldVerArr[1]) {
        return true;
      }
      return newVerArr[1] === oldVerArr[1] && newVerArr[2] > oldVerArr[2];
    case "major":
      if (newVerArr[0] > oldVerArr[0]) {
        return true;
      }
      if (newVerArr[0] === oldVerArr[0] && newVerArr[1] > oldVerArr[1]) {
        return true;
      }
      return newVerArr[0] === oldVerArr[0] && newVerArr[1] === oldVerArr[1] &&
        newVerArr[2] > oldVerArr[2];
    default:
      throw new Error("Invalid upgrade type");
  }
}
