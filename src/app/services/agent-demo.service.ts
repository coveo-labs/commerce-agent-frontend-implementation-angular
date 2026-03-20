// Main transport entry point for the Angular app.
// The container component only talks to this service. It decides whether to
// emit a local mock run or use one of the live transport implementations.
import { inject, Injectable } from '@angular/core';
import { demoAgentConfig, DemoAgentMode, DemoLiveTransport } from '../demo-agent.config';
import { AgUiEvent, StreamTurnInput } from '../models';
import { getMockScenario } from '../mock-catalog';
import { AgUiClientTransportService } from './ag-ui-client-transport.service';

type RawSseEvent = {
  event?: string;
  data: string;
};

@Injectable({ providedIn: 'root' })
export class AgentDemoService {
  private readonly agUiClientTransport = inject(AgUiClientTransportService);
  private mode: DemoAgentMode = demoAgentConfig.mode;
  private liveTransport: DemoLiveTransport = demoAgentConfig.liveTransport;

  getMode(): DemoAgentMode {
    return this.mode;
  }

  getLiveTransport(): DemoLiveTransport {
    return this.liveTransport;
  }

  setMode(mode: DemoAgentMode): void {
    this.mode = mode;
  }

  async *streamTurn(input: StreamTurnInput): AsyncGenerator<AgUiEvent> {
    if (this.mode === 'live') {
      if (this.liveTransport === 'ag-ui-client') {
        yield* this.agUiClientTransport.streamTurn(input);
        return;
      }

      yield* this.streamDeferredLiveTurn(input);
      return;
    }

    yield* this.streamMockTurn(input);
  }

  private async *streamMockTurn(input: StreamTurnInput): AsyncGenerator<AgUiEvent> {
    // The mock path emits a small but protocol-shaped AG-UI/A2UI sequence so
    // the storefront can be built and reviewed before the live endpoint exists.
    const scenario = getMockScenario(input.prompt);
    const runId = crypto.randomUUID();
    const messageId = crypto.randomUUID();
    const reasoningMessageId = `reasoning-${messageId}`;

    yield {
      type: 'RUN_STARTED',
      threadId: input.threadId,
      runId
    };

    yield {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        label: 'Understanding request'
      }
    };

    await this.delay(180);

    yield {
      type: 'REASONING_START',
      messageId: reasoningMessageId
    };

    yield {
      type: 'REASONING_MESSAGE_START',
      messageId: reasoningMessageId,
      role: 'assistant'
    };

    for (const chunk of splitReasoningText(scenario.reasoningText)) {
      yield {
        type: 'REASONING_MESSAGE_CONTENT',
        messageId: reasoningMessageId,
        delta: chunk
      };
      await this.delay(35);
    }

    yield {
      type: 'REASONING_MESSAGE_END',
      messageId: reasoningMessageId
    };

    yield {
      type: 'REASONING_END',
      messageId: reasoningMessageId
    };

    for (const toolCall of scenario.toolCalls) {
      const toolCallId = crypto.randomUUID();
      yield {
        type: 'TOOL_CALL_START',
        toolCallId,
        toolName: toolCall.name,
        toolCallName: toolCall.name
      };
      await this.delay(90);

      if (toolCall.args) {
        yield {
          type: 'TOOL_CALL_ARGS',
          toolCallId,
          delta: toolCall.args,
          argsDelta: toolCall.args
        };
        await this.delay(70);
      }

      if (toolCall.result) {
        yield {
          type: 'TOOL_CALL_RESULT',
          toolCallId,
          content: toolCall.result
        };
        await this.delay(70);
      }

      yield {
        type: 'TOOL_CALL_END',
        toolCallId
      };
      await this.delay(70);
    }

    for (const snapshot of scenario.activitySnapshots.slice(0, -1)) {
      yield {
        type: 'ACTIVITY_SNAPSHOT',
        messageId: snapshot.messageId,
        activityType: snapshot.activityType,
        content: {
          operations: snapshot.operations
        },
        replace: true
      };
      await this.delay(150);
    }

    yield {
      type: 'TEXT_MESSAGE_START',
      messageId,
      role: 'assistant'
    };

    for (const chunk of scenario.textChunks) {
      yield {
        type: 'TEXT_MESSAGE_CONTENT',
        messageId,
        delta: chunk
      };
      await this.delay(55);
    }

    yield {
      type: 'TEXT_MESSAGE_END',
      messageId
    };

    yield {
      type: 'STATE_SNAPSHOT',
      snapshot: scenario.stateSnapshot
    };

    const finalSnapshot = scenario.activitySnapshots.at(-1);

    if (finalSnapshot) {
      yield {
        type: 'ACTIVITY_SNAPSHOT',
        messageId: finalSnapshot.messageId,
        activityType: finalSnapshot.activityType,
        content: {
          operations: finalSnapshot.operations
        },
        replace: true
      };
    }

    yield {
      type: 'RUN_FINISHED',
      threadId: input.threadId,
      runId
    };
  }

  private async *streamDeferredLiveTurn(input: StreamTurnInput): AsyncGenerator<AgUiEvent> {
    // This fallback path keeps the repo usable even if the implementer chooses
    // not to adopt @ag-ui/client for the live transport layer.
    const runId = crypto.randomUUID();
    const response = await fetch(demoAgentConfig.liveEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        threadId: input.threadId,
        runId,
        state: {},
        tools: [],
        context: [],
        forwardedProps: {},
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.prompt
          }
        ]
      })
    });

    if (!response.ok || !response.body) {
      throw new Error(`Agent request failed with status ${response.status}.`);
    }

    for await (const rawEvent of this.readSse(response.body)) {
      const normalized = this.normalizeSsePayload(rawEvent);
      if (normalized) {
        yield normalized;
      }
    }
  }

  private async *readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<RawSseEvent> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const event = this.parseSseChunk(chunk);
        if (event) {
          yield event;
        }
      }
    }

    buffer += decoder.decode();
    const trailing = this.parseSseChunk(buffer);
    if (trailing) {
      yield trailing;
    }
  }

  private parseSseChunk(chunk: string): RawSseEvent | null {
    const normalizedChunk = chunk.replace(/\r\n/g, '\n').trim();
    if (!normalizedChunk) {
      return null;
    }

    const lines = normalizedChunk.split('\n');
    let eventName: string | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (!line || line.startsWith(':')) {
        continue;
      }

      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const value = line.slice(5);
        dataLines.push(value.startsWith(' ') ? value.slice(1) : value);
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    return {
      event: eventName,
      data: dataLines.join('\n')
    };
  }

  private normalizeSsePayload(rawEvent: RawSseEvent): AgUiEvent | null {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawEvent.data);
    } catch {
      return null;
    }

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const payload = parsed as Record<string, unknown>;
    const event = this.unwrapPayload(payload, rawEvent.event);

    if (!event || typeof event['type'] !== 'string') {
      return null;
    }

    return event as AgUiEvent;
  }

  private unwrapPayload(
    payload: Record<string, unknown>,
    fallbackType?: string
  ): Record<string, unknown> | null {
    // Different backends may wrap the event differently. This keeps the demo
    // tolerant to the common payload envelopes seen in SSE integrations.
    if (payload['type'] && typeof payload['type'] === 'string') {
      return payload;
    }

    if (payload['event'] && typeof payload['event'] === 'object') {
      return payload['event'] as Record<string, unknown>;
    }

    if (payload['payload'] && typeof payload['payload'] === 'object') {
      return payload['payload'] as Record<string, unknown>;
    }

    return fallbackType ? { ...payload, type: fallbackType } : payload;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

function splitReasoningText(text: string): string[] {
  return text.split(/(\s+)/).filter(Boolean);
}
