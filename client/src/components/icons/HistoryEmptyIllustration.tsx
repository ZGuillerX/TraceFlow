interface HistoryEmptyIllustrationProps {
  className?: string;
}

export default function HistoryEmptyIllustration({
  className,
}: HistoryEmptyIllustrationProps) {
  return (
    <svg className={className} viewBox="0 0 180 90">
      <path
        d="M5 64 C42 8, 66 13, 90 40 S140 70, 176 10"
        fill="none"
        stroke="#1687F8"
        strokeWidth="2"
      />
      <circle cx="5" cy="64" r="4" fill="#fff" stroke="#101A46" strokeWidth="2" />
      <circle cx="176" cy="10" r="4" fill="#fff" stroke="#1687F8" strokeWidth="2" />
    </svg>
  );
}
