import { Client } from '@notionhq/client';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ProcessedChunk } from './pdf';

export async function fetchAndProcessNotionPage(accessToken: string, pageId: string): Promise<{ title: string; chunks: ProcessedChunk[] }> {
  const notion = new Client({ auth: accessToken });

  // Get page info
  const pageResponse: any = await notion.pages.retrieve({ page_id: pageId });
  let title = 'Notion Page';

  if (pageResponse.properties) {
    const titleProperty = Object.values(pageResponse.properties).find(
      (prop: any) => prop.type === 'title'
    ) as any;
    if (titleProperty && titleProperty.title?.length > 0) {
      title = titleProperty.title.map((t: any) => t.plain_text).join('');
    }
  }

  // Get page blocks
  const blocksResponse = await notion.blocks.children.list({ block_id: pageId });
  const textLines: string[] = [];

  for (const block of blocksResponse.results as any[]) {
    const type = block.type;
    if (block[type] && block[type].rich_text) {
      const lineText = block[type].rich_text.map((t: any) => t.plain_text).join('');
      if (lineText) {
        textLines.push(lineText);
      }
    }
  }

  const fullText = textLines.join('\n\n');
  if (!fullText) {
    throw new Error('Notion page contains no readable text blocks');
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""],
  });

  const docs = await splitter.createDocuments([fullText]);

  const chunks: ProcessedChunk[] = docs.map((doc, idx) => ({
    content: doc.pageContent,
    metadata: {
      chunk_index: idx,
      total_chunks: docs.length,
    },
  }));

  return {
    title,
    chunks,
  };
}
