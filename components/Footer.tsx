
import React from 'react';
import { APP_NAME } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-100 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 mt-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-neutral-600 dark:text-neutral-400">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. 모든 권리 보유.</p>
        <p className="text-sm mt-1">
          이 도구에서 제공하는 투자 정보는 정보 제공 목적으로만 제공되며 재정 자문으로 간주되어서는 안 됩니다.
        </p>
      </div>
    </footer>
  );
};

export default Footer;