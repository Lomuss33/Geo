type WorkspaceIconName =
  | 'apply'
  | 'back'
  | 'clear'
  | 'copy'
  | 'delete'
  | 'load'
  | 'play'
  | 'reset'
  | 'warning';

type WorkspaceIconButtonProps = {
  icon: WorkspaceIconName;
  label: string;
  title?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
};

function WorkspaceIcon({ icon }: { icon: WorkspaceIconName }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      {icon === 'play' ? (
        <path
          d="M8 6.5v11l8.5-5.5z"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      ) : null}

      {icon === 'back' ? (
        <>
          <path
            d="M18 12H8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path
            d="M11 8l-4 4 4 4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}

      {icon === 'apply' ? (
        <path
          d="M6.5 12.5l3.3 3.3L17.5 8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      ) : null}

      {icon === 'reset' ? (
        <>
          <path
            d="M7 9V5h4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M7.5 6.5a7 7 0 1 1-1.2 8.7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}

      {icon === 'copy' ? (
        <>
          <rect
            x="9"
            y="7"
            width="9"
            height="11"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M6 15V8a2 2 0 0 1 2-2h6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}

      {icon === 'load' ? (
        <>
          <path
            d="M12 6v8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path
            d="M8.5 11.5L12 15l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M6.5 18h11"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}

      {icon === 'clear' ? (
        <>
          <path
            d="M7 8h10"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path
            d="M9 8V6.8A1.8 1.8 0 0 1 10.8 5h2.4A1.8 1.8 0 0 1 15 6.8V8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M8.2 8l.7 9h6.2l.7-9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}

      {icon === 'delete' ? (
        <>
          <path
            d="M8 8h8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path
            d="M9.5 8V6.8A1.8 1.8 0 0 1 11.3 5h1.4a1.8 1.8 0 0 1 1.8 1.8V8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M9 10.2v5.5M12 10.2v5.5M15 10.2v5.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.7"
          />
        </>
      ) : null}

      {icon === 'warning' ? (
        <>
          <path
            d="M12 7.5v5.7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.9"
          />
          <circle cx="12" cy="16.8" r="1" fill="currentColor" />
          <path
            d="M12 4.8l7.2 12.4H4.8z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </>
      ) : null}
    </svg>
  );
}

export function WorkspaceIconButton({
  icon,
  label,
  title,
  className,
  disabled = false,
  onClick,
  type = 'button',
}: WorkspaceIconButtonProps) {
  return (
    <button
      aria-label={label}
      className={className ?? 'animation-workspace__icon-button'}
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      type={type}
    >
      <WorkspaceIcon icon={icon} />
    </button>
  );
}
