// A small OpenAI Chat Completions tool-use harness.
//
// The endpoint is deliberately configurable because the project may point at
// OpenAI, a gateway, or a local OpenAI-compatible server.  A harness instance
// owns one conversation and one model configuration.  Callers should create a
// separate instance for independent jobs (for example, flag metadata and
// client-version diff analysis).

const DEFAULT_MAX_STEPS = 18;
const DEFAULT_MAX_TOOL_RESULT_CHARS = 24_000;

export function readModelConfig(env = process.env) {
  const endpoint =
    env.OPENAI_COMPLETIONS_URL ||
    env.OPENAI_COMPLETIONS_ENDPOINT ||
    env.OPENAI_ENDPOINT ||
    (env.OPENAI_BASE_URL
      ? new URL('chat/completions', env.OPENAI_BASE_URL.replace(/\/?$/, '/')).href
      : '');
  const apiKey = env.OPENAI_API_KEY || env.OPENAI_KEY || '';
  const model = env.OPENAI_MODEL || '';

  const missing = [];
  if (!endpoint) missing.push('OPENAI_COMPLETIONS_URL (or OPENAI_BASE_URL)');
  if (!apiKey) missing.push('OPENAI_API_KEY');
  if (!model) missing.push('OPENAI_MODEL');
  if (missing.length > 0) {
    throw new Error(`Model configuration is incomplete: missing ${missing.join(', ')}`);
  }

  return { endpoint, apiKey, model };
}

function contentAsText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  return '';
}

export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  try {
    return JSON.parse(candidate.slice(first, last + 1));
  } catch {
    return null;
  }
}

function isToolUnsupported(error) {
  if (!error || ![400, 404, 405, 422].includes(error.status)) return false;
  return /tool|function|schema|additionalproperties|unsupported|unknown field|unrecognized/i.test(error.body || error.message || '');
}

function compactToolResult(value, maxChars) {
  const text = JSON.stringify(value);
  if (text.length <= maxChars) return text;
  return JSON.stringify({
    truncated: true,
    note: `Tool result was ${text.length} characters and was truncated. Narrow the query or read a smaller range.`,
    preview: text.slice(0, maxChars),
  });
}

export class OpenAIHarness {
  constructor({
    endpoint,
    apiKey,
    model,
    fetchImpl = globalThis.fetch,
    maxSteps = DEFAULT_MAX_STEPS,
    maxToolResultChars = DEFAULT_MAX_TOOL_RESULT_CHARS,
    maxRequestAttempts = 3,
    logger = console,
  }) {
    if (!endpoint) throw new Error('OpenAIHarness requires endpoint');
    if (!apiKey) throw new Error('OpenAIHarness requires apiKey');
    if (!model) throw new Error('OpenAIHarness requires model');
    if (typeof fetchImpl !== 'function') throw new Error('OpenAIHarness requires fetchImpl');
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl;
    this.maxSteps = maxSteps;
    this.maxToolResultChars = maxToolResultChars;
    this.maxRequestAttempts = maxRequestAttempts;
    this.logger = logger;
  }

  async request(messages, tools = []) {
    const body = {
      model: this.model,
      messages,
      stream: false,
    };
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    let response;
    let errorBody = '';
    let errorStatus = 0;
    for (let attempt = 0; attempt < this.maxRequestAttempts; attempt++) {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (response.ok) break;

      errorBody = await response.text();
      errorStatus = response.status;
      const retryable = errorStatus === 429 || errorStatus === 502 || errorStatus === 503 || errorStatus === 504;
      if (!retryable || attempt === this.maxRequestAttempts - 1) break;

      let retryAfterMs = 1_000 * 2 ** attempt;
      const header = response.headers?.get?.('retry-after');
      if (header && Number.isFinite(Number(header))) retryAfterMs = Number(header) * 1_000;
      else {
        try {
          const payload = JSON.parse(errorBody);
          if (Number.isFinite(Number(payload.retry_after))) retryAfterMs = Number(payload.retry_after) * 1_000;
        } catch {
          // use exponential backoff
        }
      }
      this.logger.warn(`Model endpoint returned ${errorStatus}; retrying in ${Math.round(retryAfterMs)} ms`);
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    }

    if (!response?.ok) {
      const error = new Error(`Model endpoint responded ${errorStatus}: ${errorBody.slice(0, 2_000)}`);
      error.status = errorStatus;
      error.body = errorBody;
      throw error;
    }

    const payload = await response.json();
    const message = payload?.choices?.[0]?.message;
    if (!message) throw new Error('Model endpoint returned no choices[0].message');
    return message;
  }

  /**
   * Run one tool-using conversation.
   *
   * tools: [{ name, description, parameters, execute(args) }]
   * submitName: tool name that ends the run. Its validated argument object is
   * returned. Models that do not support tools may instead return the same JSON
   * as their final message; that is accepted as a fallback.
   * validate(value): throws a useful error if a submitted value is invalid.
   */
  async run({ system, user, tools = [], submitName, validate, fallbackWithoutTools = true }) {
    if (typeof validate !== 'function') throw new Error('Harness run requires validate');
    if (!submitName) throw new Error('Harness run requires submitName');

    const toolSpecs = tools.map(({ name, description, parameters }) => ({
      type: 'function',
      function: { name, description, parameters },
    }));
    const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
    let toolsEnabled = toolSpecs.length > 0;
    let lastValidationError = '';

    for (let step = 0; step < this.maxSteps; step++) {
      let message;
      try {
        message = await this.request(messages, toolsEnabled ? toolSpecs : []);
      } catch (error) {
        if (toolsEnabled && fallbackWithoutTools && isToolUnsupported(error)) {
          toolsEnabled = false;
          messages.push({
            role: 'user',
            content:
              'This endpoint does not support tools. Continue using only the evidence in the conversation and return the required JSON object as your final message.',
          });
          continue;
        }
        throw error;
      }

      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      if (toolCalls.length > 0) {
        messages.push({ ...message, role: message.role || 'assistant' });

        for (const call of toolCalls) {
          const name = call?.function?.name;
          const rawArgs = call?.function?.arguments ?? '{}';
          let args;
          try {
            args = typeof rawArgs === 'string' ? JSON.parse(rawArgs.trim() || '{}') : rawArgs;
          } catch {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ error: 'Tool arguments were not valid JSON.' }),
            });
            continue;
          }

          if (name === submitName) {
            try {
              return validate(args);
            } catch (error) {
              lastValidationError = error.message;
              this.logger.warn(`Model submission rejected: ${error.message}`);
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({
                  error: `Submission rejected: ${error.message}. Correct it and call ${submitName} again.`,
                }),
              });
              continue;
            }
          }

          const tool = toolByName.get(name);
          if (!tool) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ error: `Unknown tool: ${name}` }),
            });
            continue;
          }

          try {
            const result = await tool.execute(args || {});
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: compactToolResult(result, this.maxToolResultChars),
            });
          } catch (error) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({ error: error.message }),
            });
          }
        }
        continue;
      }

      const text = contentAsText(message.content);
      if (text) {
        messages.push({ role: 'assistant', content: text });
        const parsed = extractJson(text);
        if (parsed) {
          try {
            return validate(parsed);
          } catch (error) {
            lastValidationError = error.message;
          }
        }
      }

      if (!toolsEnabled) {
        messages.push({
          role: 'user',
          content: `Your last answer could not be accepted. ${lastValidationError || 'Return one JSON object matching the schema.'} Return ONLY the corrected JSON object.`,
        });
      } else {
        messages.push({
          role: 'user',
          content: `Finish the analysis by calling ${submitName}. ${lastValidationError || 'Do not stop before submitting a valid result.'}`,
        });
      }
    }

    throw new Error(
      `Model did not submit a valid result within ${this.maxSteps} steps${lastValidationError ? `: ${lastValidationError}` : ''}`,
    );
  }
}
