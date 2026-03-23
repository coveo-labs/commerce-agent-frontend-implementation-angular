// Main transport entry point for the Angular app.
// The Angular-facing contract is an Observable stream of AG-UI events.
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { demoAgentConfig, DemoAgentMode, DemoLiveTransport } from '../demo-agent.config';
import { getMockScenario, MockScenario, MockToolCall } from '../mock-catalog';
import { AgUiEvent, StreamTurnInput } from '../models';
import { AgUiClientTransportService } from './ag-ui-client-transport.service';

type RawSseEvent = {
  event?: string;
  data: string;
};

type EventSubscriber = {
  next(value: AgUiEvent): void;
  complete(): void;
  error(error: unknown): void;
  closed: boolean;
};

type EventSink = {
  emit(event: AgUiEvent, delayMs?: number): Promise<boolean>;
  complete(): void;
  error(error: unknown): void;
  isClosed(): boolean;
};

type MockRunContext = {
  input: StreamTurnInput;
  scenario: MockScenario;
  runId: string;
  messageId: string;
  reasoningMessageId: string;
};

@Injectable({ providedIn: 'root' })
export class AgentDemoService {
  private readonly agUiClientTransport = inject(AgUiClientTransportService);
  private readonly liveTransport: DemoLiveTransport = demoAgentConfig.liveTransport;

  getLiveTransport(): DemoLiveTransport {
    return this.liveTransport;
  }

  streamTurn(input: StreamTurnInput, mode: DemoAgentMode): Observable<AgUiEvent> {
    if (mode === 'live') {
      return this.streamLiveTurn(input);
    }

    return this.streamMockTurn(input);
  }

  private streamLiveTurn(input: StreamTurnInput): Observable<AgUiEvent> {
    if (this.liveTransport === 'ag-ui-client') {
      return this.agUiClientTransport.streamTurn(input);
    }

    return this.streamDeferredLiveTurn(input);
  }

  private streamMockTurn(input: StreamTurnInput): Observable<AgUiEvent> {
    return new Observable<AgUiEvent>((subscriber) => {
      let cancelled = false;
      const sink = this.createEventSink(subscriber, () => cancelled);
      const context = this.createMockRunContext(input);

      void this.runMockTurn(context, sink);

      return () => {
        cancelled = true;
      };
    });
  }

  private async runMockTurn(context: MockRunContext, sink: EventSink): Promise<void> {
    try {
      if (!(await this.emitMockPrelude(context, sink))) {
        return;
      }

      if (!(await this.emitReasoningSequence(context, sink))) {
        return;
      }

      if (!(await this.emitToolCallSequence(context.scenario.toolCalls, sink))) {
        return;
      }

      if (!(await this.emitIntermediateSnapshots(context.scenario.activitySnapshots, sink))) {
        return;
      }

      if (!(await this.emitAssistantResponse(context, sink))) {
        return;
      }

      if (!(await this.emitFinalSnapshot(context.scenario.activitySnapshots.at(-1), sink))) {
        return;
      }

      if (!(await this.emitRunFinished(context, sink))) {
        return;
      }

      if (!sink.isClosed()) {
        sink.complete();
      }
    } catch (error) {
      sink.error(error);
    }
  }

  private createMockRunContext(input: StreamTurnInput): MockRunContext {
    const messageId = crypto.randomUUID();

    return {
      input,
      scenario: getMockScenario(input.prompt),
      runId: crypto.randomUUID(),
      messageId,
      reasoningMessageId: `reasoning-${messageId}`,
    };
  }

  private createEventSink(
    subscriber: EventSubscriber,
    isCancelled: () => boolean,
  ): EventSink {
    return {
      emit: async (event: AgUiEvent, delayMs = 0) => {
        if (isCancelled() || subscriber.closed) {
          return false;
        }

        subscriber.next(event);

        if (delayMs > 0) {
          await this.delay(delayMs);
        }

        return !isCancelled() && !subscriber.closed;
      },
      complete: () => {
        if (!subscriber.closed) {
          subscriber.complete();
        }
      },
      error: (error: unknown) => {
        if (!subscriber.closed) {
          subscriber.error(error);
        }
      },
      isClosed: () => isCancelled() || subscriber.closed,
    };
  }

  private async emitMockPrelude(context: MockRunContext, sink: EventSink): Promise<boolean> {
    if (
      !(await sink.emit({
        type: 'RUN_STARTED',
        threadId: context.input.threadId,
        runId: context.runId,
      }))
    ) {
      return false;
    }

    return sink.emit(
      {
        type: 'STATE_SNAPSHOT',
        snapshot: {
          label: 'Understanding request',
        },
      },
      180,
    );
  }

  private async emitReasoningSequence(
    context: MockRunContext,
    sink: EventSink,
  ): Promise<boolean> {
    if (
      !(await sink.emit({
        type: 'REASONING_START',
        messageId: context.reasoningMessageId,
      }))
    ) {
      return false;
    }

    if (
      !(await sink.emit({
        type: 'REASONING_MESSAGE_START',
        messageId: context.reasoningMessageId,
        role: 'assistant',
      }))
    ) {
      return false;
    }

    for (const chunk of splitReasoningText(context.scenario.reasoningText)) {
      if (
        !(await sink.emit(
          {
            type: 'REASONING_MESSAGE_CONTENT',
            messageId: context.reasoningMessageId,
            delta: chunk,
          },
          35,
        ))
      ) {
        return false;
      }
    }

    if (
      !(await sink.emit({
        type: 'REASONING_MESSAGE_END',
        messageId: context.reasoningMessageId,
      }))
    ) {
      return false;
    }

    return sink.emit({
      type: 'REASONING_END',
      messageId: context.reasoningMessageId,
    });
  }

  private async emitToolCallSequence(
    toolCalls: MockToolCall[],
    sink: EventSink,
  ): Promise<boolean> {
    for (const toolCall of toolCalls) {
      if (!(await this.emitToolCall(toolCall, sink))) {
        return false;
      }
    }

    return true;
  }

  private async emitToolCall(toolCall: MockToolCall, sink: EventSink): Promise<boolean> {
    const toolCallId = crypto.randomUUID();

    if (
      !(await sink.emit(
        {
          type: 'TOOL_CALL_START',
          toolCallId,
          toolName: toolCall.name,
          toolCallName: toolCall.name,
        },
        90,
      ))
    ) {
      return false;
    }

    if (
      toolCall.args &&
      !(await sink.emit(
        {
          type: 'TOOL_CALL_ARGS',
          toolCallId,
          delta: toolCall.args,
          argsDelta: toolCall.args,
        },
        70,
      ))
    ) {
      return false;
    }

    if (
      toolCall.result &&
      !(await sink.emit(
        {
          type: 'TOOL_CALL_RESULT',
          toolCallId,
          content: toolCall.result,
        },
        70,
      ))
    ) {
      return false;
    }

    return sink.emit(
      {
        type: 'TOOL_CALL_END',
        toolCallId,
      },
      70,
    );
  }

  private async emitIntermediateSnapshots(
    snapshots: MockScenario['activitySnapshots'],
    sink: EventSink,
  ): Promise<boolean> {
    for (const snapshot of snapshots.slice(0, -1)) {
      if (!(await sink.emit(this.toActivitySnapshotEvent(snapshot), 150))) {
        return false;
      }
    }

    return true;
  }

  private async emitAssistantResponse(
    context: MockRunContext,
    sink: EventSink,
  ): Promise<boolean> {
    if (
      !(await sink.emit({
        type: 'TEXT_MESSAGE_START',
        messageId: context.messageId,
        role: 'assistant',
      }))
    ) {
      return false;
    }

    for (const chunk of context.scenario.textChunks) {
      if (
        !(await sink.emit(
          {
            type: 'TEXT_MESSAGE_CONTENT',
            messageId: context.messageId,
            delta: chunk,
          },
          55,
        ))
      ) {
        return false;
      }
    }

    if (
      !(await sink.emit({
        type: 'TEXT_MESSAGE_END',
        messageId: context.messageId,
      }))
    ) {
      return false;
    }

    return sink.emit({
      type: 'STATE_SNAPSHOT',
      snapshot: context.scenario.stateSnapshot,
    });
  }

  private emitFinalSnapshot(
    snapshot: MockScenario['activitySnapshots'][number] | undefined,
    sink: EventSink,
  ): Promise<boolean> {
    if (!snapshot) {
      return Promise.resolve(true);
    }

    return sink.emit(this.toActivitySnapshotEvent(snapshot));
  }

  private emitRunFinished(context: MockRunContext, sink: EventSink): Promise<boolean> {
    return sink.emit({
      type: 'RUN_FINISHED',
      threadId: context.input.threadId,
      runId: context.runId,
    });
  }

  private toActivitySnapshotEvent(
    snapshot: MockScenario['activitySnapshots'][number],
  ): AgUiEvent {
    return {
      type: 'ACTIVITY_SNAPSHOT',
      messageId: snapshot.messageId,
      activityType: snapshot.activityType,
      content: {
        operations: snapshot.operations,
      },
      replace: true,
    };
  }

  private streamDeferredLiveTurn(input: StreamTurnInput): Observable<AgUiEvent> {
    return new Observable<AgUiEvent>((subscriber) => {
      const controller = new AbortController();

      void this.runDeferredLiveTurn(input, subscriber, controller);

      return () => {
        controller.abort();
      };
    });
  }

  private async runDeferredLiveTurn(
    input: StreamTurnInput,
    subscriber: EventSubscriber,
    controller: AbortController,
  ): Promise<void> {
    try {
      const stream = await this.requestLiveTurn(input, controller.signal);
      await this.forwardLiveEvents(stream, subscriber);

      if (!subscriber.closed) {
        subscriber.complete();
      }
    } catch (error) {
      if (controller.signal.aborted || subscriber.closed) {
        return;
      }

      subscriber.error(error);
    }
  }

  private async requestLiveTurn(
    input: StreamTurnInput,
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(demoAgentConfig.liveEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify(this.buildLiveRequestBody(input)),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Agent request failed with status ${response.status}.`);
    }

    return response.body;
  }

  private buildLiveRequestBody(input: StreamTurnInput): Record<string, unknown> {
    return {
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
          content: input.prompt,
        },
      ],
    };
  }

  private async forwardLiveEvents(
    stream: ReadableStream<Uint8Array>,
    subscriber: EventSubscriber,
  ): Promise<void> {
    for await (const rawEvent of this.readSse(stream)) {
      if (subscriber.closed) {
        return;
      }

      const normalized = this.normalizeSsePayload(rawEvent);
      if (normalized) {
        subscriber.next(normalized);
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
        continue;
      }

      if (line.startsWith('data:')) {
        const value = line.slice(5);
        dataLines.push(value.startsWith(' ') ? value.slice(1) : value);
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    return {
      event: eventName,
      data: dataLines.join('\n'),
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
    fallbackType?: string,
  ): Record<string, unknown> | null {
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
