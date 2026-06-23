import { UIMessage, UIDataTypes, UITools } from 'ai';

// Generic UIMessage type for the app. The previous tool-based chat agent has
// been removed, so this no longer infers tool types from a tool set.
export type FinanceUIMessage = UIMessage<never, UIDataTypes, UITools>;
