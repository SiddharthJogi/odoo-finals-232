export default function PresenceBadge({ isPresent }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
      isPresent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${isPresent ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {isPresent ? 'Present' : 'Absent'}
    </span>
  );
}
