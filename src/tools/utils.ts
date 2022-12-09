import { YamlLoader } from "yaml_loader";

export async function readYaml<T>(path: string): Promise<T> {
  let allPath = path;
  if (!/\.(yaml|yml)$/.test(path)) {
    allPath += ".yaml";
  }
  const yamlLoader = new YamlLoader();
  const data = await yamlLoader.parseFile(allPath);
  return data as T;
}
