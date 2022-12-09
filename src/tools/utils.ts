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

export interface ReadableStreamResult {
  body: ReadableStream;
  write(message: string): void;
  end(message?: string): void;
}

const te = new TextEncoder();
export function getReadableStream(): ReadableStreamResult {
  let controller: ReadableStreamDefaultController;
  const body = new ReadableStream({
    start(_controller) {
      controller = _controller;
    },
  });
  return {
    body,
    write(message: string) {
      controller.enqueue(te.encode(message));
    },
    end(message?: string) {
      if (message) {
        controller.enqueue(te.encode(message));
      }
      controller.close();
    },
  };
}
