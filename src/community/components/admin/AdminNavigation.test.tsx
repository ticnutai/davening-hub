import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Tabs } from '@/components/ui/tabs';
import { AdminNavigation, ADMIN_SECTIONS } from './AdminNavigation';
import { QuickAddButton } from '../QuickAddButton';
vi.mock('@community/lib/use-auth', () => ({ useAuth: () => ({ isAdmin: true, loading: false }) }));
afterEach(cleanup);
function Location() { return <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>; }
describe('canonical admin entry points', () => {
  it('has exactly one tab for each destination and keeps existing keys', () => {
    const change = vi.fn();
    render(<Tabs defaultValue="minyanim" onValueChange={change}><AdminNavigation storeApp={false} unread={3} /></Tabs>);
    const ids = ADMIN_SECTIONS.flatMap(g => g.items.map(i => i[0]));
    expect(new Set(ids).size).toBe(14);
    expect(screen.getAllByRole('tab')).toHaveLength(14);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'פניות לגבאי (3)' }), { button: 0, ctrlKey: false });
    expect(change).toHaveBeenCalledWith('messages');
  });
  it('retains store restrictions without hiding other destinations', () => {
    render(<Tabs defaultValue="minyanim"><AdminNavigation storeApp unread={0} /></Tabs>);
    expect(screen.getAllByRole('tab')).toHaveLength(12);
    expect(screen.queryByRole('tab', { name: 'לוחות ומסכים' })).toBeNull();
  });
  for (const [label, tab] of [['מודעה', 'announcements'], ['שיעור', 'shiurim'], ['חברותא', 'chavrutot'], ['מניין', 'minyanim']]) {
    it(`routes ${label} to its existing editor without a second form`, () => {
      render(<MemoryRouter><QuickAddButton /><Location /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'הוספה מהירה' }));
      expect(document.querySelectorAll('form')).toHaveLength(0);
      fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + label + ' ') }));
      expect(screen.getByTestId('location')).toHaveTextContent(`/community/admin?tab=${tab}`);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  }
});
