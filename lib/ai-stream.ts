const encoder = new TextEncoder();

const toSseEvent = (event: string, data: unknown) =>
  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

export const stripCodeFences = (value: string) =>
  value.replace(/```json/g, "").replace(/```/g, "").trim();

export const parseJsonCompletion = <T>(value: string): T =>
  JSON.parse(stripCodeFences(value)) as T;

export function streamOpenAIResponse<T>({
  upstream,
  parse,
  onDone,
}: {
  upstream: Response;
  parse: (raw: string) => T;
  onDone?: (data: T, raw: string) => Promise<T | void> | T | void;
}) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        controller.enqueue(toSseEvent("error", { message: "AI stream unavailable" }));
        controller.close();
        return;
      }

      let buffer = "";
      let rawText = "";

      const processSseBlock = (block: string) => {
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

        if (event !== "message") return;

        const payload = dataLines.join("\n");
        if (!payload || payload === "[DONE]") return;

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            rawText += delta;
            controller.enqueue(toSseEvent("delta", { text: delta }));
          }
        } catch {
          // Ignore partial or non-standard chunks from the provider.
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
            processSseBlock(part);
          }
        }

        if (buffer.trim()) {
          processSseBlock(buffer);
        }

        let finalData = parse(rawText);
        if (onDone) {
          const maybeUpdated = await onDone(finalData, rawText);
          if (maybeUpdated !== undefined) {
            finalData = maybeUpdated;
          }
        }

        controller.enqueue(toSseEvent("done", finalData));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI streaming failed";
        controller.enqueue(toSseEvent("error", { message }));
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
