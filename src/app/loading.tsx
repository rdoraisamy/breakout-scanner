export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-amber-400 font-mono text-lg animate-pulse">
          ◈ BREAKOUT SCANNER
        </div>
        <div className="text-gray-600 font-mono text-xs mt-2">
          Initializing market data...
        </div>
      </div>
    </div>
  );
}
