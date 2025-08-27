// Citation extraction and management utilities

export interface Citation {
  number: string;
  title: string;
  url: string;
  description?: string;
  quote?: string;
  source?: string;
  date?: string;
  authors?: string[];
  doi?: string;
  relevanceScore?: number;
  toolType?: 'financial' | 'web' | 'wiley';
}

export interface CitationMap {
  [key: string]: Citation[];
}

// Extract citations from tool results and maintain citation numbers
export function extractCitationsFromToolResults(toolResults: any[]): CitationMap {
  const citations: CitationMap = {};
  let citationNumber = 1;

  toolResults.forEach((result) => {
    if (!result || !result.output) return;

    try {
      const output = typeof result.output === 'string' 
        ? JSON.parse(result.output) 
        : result.output;

      // Handle search results with multiple items
      if (output.results && Array.isArray(output.results)) {
        output.results.forEach((item: any) => {
          const citation: Citation = {
            number: citationNumber.toString(),
            title: item.title || `Source ${citationNumber}`,
            url: item.url || '',
            description: item.content || item.summary || item.description,
            source: item.source,
            date: item.date,
            relevanceScore: item.relevanceScore || item.relevance_score,
            toolType: getToolType(result.toolName),
          };

          // Add academic-specific fields
          if (item.authors) {
            citation.authors = Array.isArray(item.authors) ? item.authors : [item.authors];
          }
          if (item.doi) {
            citation.doi = item.doi;
          }
          if (item.citation) {
            citation.quote = item.citation;
          }

          const key = `[${citationNumber}]`;
          citations[key] = [citation];
          citationNumber++;
        });
      }
    } catch (error) {
      console.error('Error extracting citations from tool result:', error);
    }
  });

  return citations;
}

// Get tool type from tool name
function getToolType(toolName?: string): 'financial' | 'web' | 'wiley' | undefined {
  if (!toolName) return undefined;
  
  if (toolName.toLowerCase().includes('financial')) return 'financial';
  if (toolName.toLowerCase().includes('wiley')) return 'wiley';
  if (toolName.toLowerCase().includes('web')) return 'web';
  
  return undefined;
}

// Parse text and identify citation markers
export function parseCitations(text: string): { segments: Array<{ type: 'text' | 'citation', content: string }> } {
  const citationPattern = /\[(\d+)\]/g;
  const segments: Array<{ type: 'text' | 'citation', content: string }> = [];
  let lastIndex = 0;

  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    // Add citation
    segments.push({
      type: 'citation',
      content: match[0] // Full citation like [1]
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return { segments };
}

// Collect all citations from a message's tool calls
export function collectMessageCitations(message: any): CitationMap {
  const citations: CitationMap = {};
  
  if (!message.parts) return citations;

  message.parts.forEach((part: any) => {
    if (part.type === 'tool-result' && part.result) {
      const toolCitations = extractCitationsFromToolResults([{
        toolName: part.toolName,
        output: part.result
      }]);
      
      Object.assign(citations, toolCitations);
    }
  });

  return citations;
}

// Merge citations from multiple messages
export function mergeCitations(...citationMaps: CitationMap[]): CitationMap {
  const merged: CitationMap = {};
  
  citationMaps.forEach(map => {
    Object.entries(map).forEach(([key, citations]) => {
      if (!merged[key]) {
        merged[key] = [];
      }
      merged[key].push(...citations);
    });
  });

  return merged;
}