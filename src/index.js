import { buildSystemPrompt } from "./chat-core.js";
import { knowledge } from "./knowledge.js";
import { handleRequest } from "./worker.js";

export { BudgetCounter } from "./worker.js";

const systemPrompt = buildSystemPrompt(knowledge);

export default {
  fetch(request, env, context) {
    return handleRequest(request, env, context, { systemPrompt });
  },
};
