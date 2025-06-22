import React from 'react';
import { NewsArticle } from '../types';
import { ExternalLink, Newspaper } from 'lucide-react';

interface NewsItemProps {
  article: NewsArticle;
}

const NewsItem: React.FC<NewsItemProps> = ({ article }) => {
  return (
    <div className="bg-base-DEFAULT dark:bg-neutral-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-start mb-2">
        <Newspaper className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-1" />
        <h3 className="text-md font-semibold text-neutral-800 dark:text-neutral-100">{article.title}</h3>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">{article.summary}</p>
      <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
        <span>출처: {article.sourceName || "정보 없음"}</span>
        <span>{article.publishedDateText || "최근"}</span>
      </div>
      {article.url && article.url !== '#' && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center text-sm text-primary hover:text-secondary dark:text-sky-400 dark:hover:text-sky-300"
        >
          더 읽어보기 <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      )}
    </div>
  );
};

export default NewsItem;