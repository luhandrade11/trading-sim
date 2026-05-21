import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0e1117] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold text-gray-800 mb-2">404</div>
        <div className="text-gray-400 mb-6">Página não encontrada</div>
        <Link
          href="/"
          className="px-4 py-2 bg-green-500 text-black font-semibold rounded-lg text-sm hover:bg-green-400 transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
