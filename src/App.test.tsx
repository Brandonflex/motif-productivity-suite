import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('renders the dashboard and key workspace content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/active projects/i)).toBeInTheDocument();
    expect(screen.getByText(/here is what is happening in your workspace today/i)).toBeInTheDocument();
  });
});
