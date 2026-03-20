// Alternative live transport based on the official AG-UI client SDK.
// This service adapts the SDK's observable-style event stream into the async
// generator pattern used by the rest of the Angular sample.
import { Injectable } from '@angular/core';
import { BaseEvent, HttpAgent } from '@ag-ui/client';
import { AgUiEvent, StreamTurnInput } from '../models';
import { demoAgentConfig } from '../demo-agent.config';

type QueueItem =
  | { kind: 'event'; event: AgUiEvent }
  | { kind: 'error'; error: Error }
  | { kind: 'complete' };

type EventStreamSubscription = {
  unsubscribe(): void;
};

type EventStreamObserver = {
  next(value: BaseEvent): void;
  error(error: unknown): void;
  complete(): void;
};

type EventStream = {
  subscribe(observer: EventStreamObserver): EventStreamSubscription;
};

@Injectable({ providedIn: 'root' })
export class AgUiClientTransportService {
  async *streamTurn(input: StreamTurnInput): AsyncGenerator<AgUiEvent> {
    const agent = new HttpAgent({
      url: demoAgentConfig.liveEndpoint
    });

    const events = agent.run({
      threadId: input.threadId,
      runId: crypto.randomUUID(),
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
    });

    yield* this.observableToAsyncGenerator(events);
  }

  private async *observableToAsyncGenerator(
    source$: EventStream
  ): AsyncGenerator<AgUiEvent> {
    const queue: QueueItem[] = [];
    let resolver: (() => void) | null = null;

    const notify = (): void => {
      if (resolver) {
        const resolve = resolver;
        resolver = null;
        resolve();
      }
    };

    const subscription = source$.subscribe({
      next: (event) => {
        const normalized = this.normalizeEvent(event);
        if (!normalized) {
          return;
        }
        queue.push({ kind: 'event', event: normalized });
        notify();
      },
      error: (error: unknown) => {
        queue.push({
          kind: 'error',
          error: error instanceof Error ? error : new Error('AG-UI client request failed.')
        });
        notify();
      },
      complete: () => {
        queue.push({ kind: 'complete' });
        notify();
      }
    });

    try {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            resolver = resolve;
          });
        }

        const item = queue.shift();
        if (!item) {
          continue;
        }

        if (item.kind === 'event') {
          yield item.event;
          continue;
        }

        if (item.kind === 'error') {
          throw item.error;
        }

        return;
      }
    } finally {
      subscription.unsubscribe();
    }
  }

  private normalizeEvent(event: BaseEvent): AgUiEvent | null {
    // The app renders against its own small event union. This mapper keeps the
    // rest of the Angular code isolated from SDK-specific event shapes.
    const payload = event as Record<string, unknown>;

    switch (event.type) {
      case 'RUN_STARTED':
        return {
          type: 'RUN_STARTED',
          threadId: this.optionalString(payload['threadId']),
          runId: this.optionalString(payload['runId'])
        };
      case 'RUN_FINISHED':
        return {
          type: 'RUN_FINISHED',
          threadId: this.optionalString(payload['threadId']),
          runId: this.optionalString(payload['runId'])
        };
      case 'TEXT_MESSAGE_START':
        return {
          type: 'TEXT_MESSAGE_START',
          messageId: this.requiredString(payload['messageId']),
          role: this.optionalAssistantRole(payload['role'])
        };
      case 'TEXT_MESSAGE_CONTENT':
        return {
          type: 'TEXT_MESSAGE_CONTENT',
          messageId: this.requiredString(payload['messageId']),
          delta: this.requiredString(payload['delta'])
        };
      case 'TEXT_MESSAGE_END':
        return {
          type: 'TEXT_MESSAGE_END',
          messageId: this.requiredString(payload['messageId'])
        };
      case 'TOOL_CALL_START':
        return {
          type: 'TOOL_CALL_START',
          toolCallId: this.optionalString(payload['toolCallId']),
          toolName: this.optionalString(payload['toolCallName']),
          toolCallName: this.optionalString(payload['toolCallName'])
        };
      case 'TOOL_CALL_ARGS':
        return {
          type: 'TOOL_CALL_ARGS',
          toolCallId: this.optionalString(payload['toolCallId']),
          delta: this.optionalString(payload['delta'])
        };
      case 'TOOL_CALL_RESULT':
        return {
          type: 'TOOL_CALL_RESULT',
          toolCallId: this.optionalString(payload['toolCallId']),
          content: this.optionalString(payload['content'])
        };
      case 'TOOL_CALL_END':
        return {
          type: 'TOOL_CALL_END',
          toolCallId: this.optionalString(payload['toolCallId'])
        };
      case 'STATE_SNAPSHOT':
        return {
          type: 'STATE_SNAPSHOT',
          snapshot: this.recordValue(payload['snapshot'])
        };
      case 'ACTIVITY_SNAPSHOT':
        return {
          type: 'ACTIVITY_SNAPSHOT',
          messageId: this.optionalString(payload['messageId']),
          activityType: this.optionalString(payload['activityType']),
          content: this.normalizeActivityContent(payload['content']),
          replace: typeof payload['replace'] === 'boolean' ? payload['replace'] : true
        };
      case 'REASONING_START':
      case 'THINKING_START':
        return {
          type: 'REASONING_START',
          messageId: this.requiredString(payload['messageId'])
        };
      case 'REASONING_MESSAGE_START':
      case 'THINKING_TEXT_MESSAGE_START':
        return {
          type: 'REASONING_MESSAGE_START',
          messageId: this.requiredString(payload['messageId']),
          role: this.optionalAssistantRole(payload['role'])
        };
      case 'REASONING_MESSAGE_CONTENT':
      case 'THINKING_TEXT_MESSAGE_CONTENT':
        return {
          type: 'REASONING_MESSAGE_CONTENT',
          messageId: this.requiredString(payload['messageId']),
          delta: this.requiredString(payload['delta'])
        };
      case 'REASONING_MESSAGE_END':
      case 'THINKING_TEXT_MESSAGE_END':
        return {
          type: 'REASONING_MESSAGE_END',
          messageId: this.requiredString(payload['messageId'])
        };
      case 'REASONING_END':
      case 'THINKING_END':
        return {
          type: 'REASONING_END',
          messageId: this.requiredString(payload['messageId'])
        };
      default:
        return null;
    }
  }

  private normalizeActivityContent(value: unknown): { operations: Record<string, unknown>[] } {
    if (!value || typeof value !== 'object') {
      return { operations: [] };
    }

    const content = value as Record<string, unknown>;
    const operations = Array.isArray(content['operations'])
      ? (content['operations'] as Record<string, unknown>[])
      : [];

    return { operations };
  }

  private recordValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private requiredString(value: unknown): string {
    if (typeof value === 'string' && value) {
      return value;
    }

    throw new Error('AG-UI client emitted an invalid event payload.');
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value ? value : undefined;
  }

  private optionalAssistantRole(value: unknown): 'assistant' | undefined {
    return value === 'assistant' ? 'assistant' : undefined;
  }
}
