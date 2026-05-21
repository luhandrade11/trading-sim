"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0e1117] flex items-center justify-center">
      <div className="bg-[#161b22] border border-red-800 rounded-xl p-8 max-w-lg w-full">
        <h2 className="text-red-400 font-bold text-lg mb-2">Erro na página</h2>
        <p className="text-gray-400 text-sm mb-4">{error.message}</p>
        {error.digest && (
          <p className="text-gray-600 text-xs mb-4">digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-green-500 text-black rounded-lg text-sm font-semibold"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
