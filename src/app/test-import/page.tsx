'use client';

import { SimpleUploadTest } from '@/components/import/simple-upload-test';

export default function TestImportPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Import Testing Page</h1>
      <SimpleUploadTest />
    </div>
  );
}