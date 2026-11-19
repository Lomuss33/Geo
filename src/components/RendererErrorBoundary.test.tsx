import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { RendererErrorBoundary } from './RendererErrorBoundary';

it('keeps recovery controls outside a failed scene and recovers after a retry key changes', async () => {
  const error = new Error('Controlled renderer boot failure');
  const report = vi.fn();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  function Scene({ retry }: { retry: number }) {
    if (!retry) throw error;
    return <p>Rendered scene</p>;
  }
  function Shell() {
    const [retry, setRetry] = useState(0);
    return (
      <>
        <button onClick={() => setRetry((value) => value + 1)}>
          Retry scene
        </button>
        <RendererErrorBoundary key={retry} onError={report}>
          <Scene retry={retry} />
        </RendererErrorBoundary>
      </>
    );
  }
  try {
    render(<Shell />);
    expect(report).toHaveBeenCalledWith(error);
    expect(screen.queryByText('Rendered scene')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry scene' }));
    expect(screen.getByText('Rendered scene')).toBeVisible();
  } finally {
    consoleError.mockRestore();
  }
});
