import type { ReactNode } from 'react';

type SceneFallbackProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function SceneFallback({ title, body, action }: SceneFallbackProps) {
  return (
    <div className="scene-fallback" role="status">
      <p className="panel-kicker">Geo Viewer</p>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
