import { InferUITools, UIMessage, UIDataTypes } from 'ai';
import { financeTools } from './tools';

// Infer the types from our finance tools
export type FinanceUITools = InferUITools<typeof financeTools>;

// Create a custom UIMessage type with our tools
export type FinanceUIMessage = UIMessage<never, UIDataTypes, FinanceUITools>;