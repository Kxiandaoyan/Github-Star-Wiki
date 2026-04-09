import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="premium-card w-full max-w-lg rounded-[2rem] p-10 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-6 text-5xl font-semibold text-foreground">404</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          这个项目不存在，或者已经从当前知识库中移除。
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground shadow-lg shadow-primary/20"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
