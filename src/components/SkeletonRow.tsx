export default function SkeletonRow() {
  return (
    <tr className="border-b border-gray-800 animate-pulse">
      {[60, 140, 80, 70, 80, 70, 60, 60].map((w, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 bg-gray-800 rounded" style={{ width: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
}
