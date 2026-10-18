import { buildSystemPrompt } from "./chat-core.js";
import { knowledge, owner, updatedAt } from "./knowledge.js";
import { handleRequest } from "./worker.js";

export { BudgetCounter } from "./worker.js";

const systemPrompt = buildSystemPrompt(knowledge, { owner, updatedAt });

export default {
  fetch(request, env, context) {
    return handleRequest(request, env, context, { systemPrompt, owner });
  },
};
