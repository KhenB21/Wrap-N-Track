import React from 'react';
import Sidebar from './Sidebar/Sidebar';
import TopBar from './TopBar';

/**
 * Shared page shell: Sidebar + TopBar + content slot.
 * Uses the same `dashboard-container`/`dashboard-main` classNames the app
 * already defines responsive rules for (App.css) — this is a convenience
 * wrapper around the existing shell markup, not a new layout system, so
 * pages adopting it don't need any new CSS to render correctly.
 */
export default function AppShell({
  children,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  avatarUrl,
  lowStockProducts,
  contentClassName = '',
  showSearch = true
}) {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          avatarUrl={avatarUrl}
          lowStockProducts={lowStockProducts}
          showSearch={showSearch}
        />
        <div className={`ui-page-content ${contentClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}
