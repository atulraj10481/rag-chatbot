import * as cheerio from 'cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ProcessedChunk } from './pdf';

export async function scrapeAndProcessURL(url: string): Promise<{ title: string; chunks: ProcessedChunk[] }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}): ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove script tags, style tags, nav, header, footer
  $('script, style, nav, header, footer, noscript, svg, iframe').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || url;

  // Extract main text content
  const mainContent = $('main, article, #content, .content, body').text();
  const cleanText = mainContent.replace(/\s+/g, ' ').trim();

  if (!cleanText) {
    throw new Error('No readable text content found at the target URL');
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""],
  });

  const docs = await splitter.createDocuments([cleanText]);

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
