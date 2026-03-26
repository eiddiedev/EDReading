export async function readStreamedJson<T>({
  response,
  onDelta,
}: {
  response: Response;
  onDelta?: (text: string) => void;
}): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json().catch(() => ({}));
      const message =
        payload?.error || payload?.message || "Request failed";
      throw new Error(message);
    }

    throw new Error("Request failed");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    return (await response.json()) as T;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Stream reader unavailable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalData: T | undefined;

  const processBlock = (block: string) => {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
        continue;
      }

      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length === 0) return;
    const payload = JSON.parse(dataLines.join("\n"));

    if (event === "delta") {
      onDelta?.(payload.text || "");
      return;
    }

    if (event === "error") {
      throw new Error(payload.message || "Streaming failed");
    }

    if (event === "done") {
      finalData = payload as T;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        processBlock(part);
      }
    }

    if (buffer.trim()) {
      processBlock(buffer);
    }
  } finally {
    reader.releaseLock();
  }

  if (finalData === undefined) {
    throw new Error("Streaming response ended before completion");
  }

  return finalData;
}
