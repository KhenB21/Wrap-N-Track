import './clickable.css';

// Makes any dashboard card / row / tile a link to its page: click, Enter or
// Space navigates, and it gets the shared hover + focus styling. `to` is a
// path; `state` is optional router state the destination reads as a preset
// filter (e.g. Inventory's { filter: 'low-stock' }).
export function linkProps(navigate, to, state, label) {
  if (!to) return {};
  const go = () => navigate(to, state ? { state } : undefined);
  // stopPropagation: a row inside a clickable panel goes to its own page, not
  // the panel's. Chart bars/slices do the same in Components/Charts.
  return {
    onClick: (e) => { e.stopPropagation(); go(); },
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); go(); }
    },
    role: 'link',
    tabIndex: 0,
    title: label ? `Open ${label}` : undefined,
    'data-clickable': 'true',
  };
}
