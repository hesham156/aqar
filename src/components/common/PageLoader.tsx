import { Loader2 } from 'lucide-react';

const PageLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto text-primary-600 animate-spin" />
        <p className="mt-4 text-lg font-medium text-gray-700">Loading...</p>
      </div>
    </div>
  );
};

export default PageLoader;