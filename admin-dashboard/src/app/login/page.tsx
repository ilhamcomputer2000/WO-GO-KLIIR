"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandLogo } from "@/components/layout/brand-logo";
import { useAuthStore } from "@/stores/auth-store";
import { DEMO_CREDENTIALS } from "@/lib/mock-data";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await new Promise((r) => setTimeout(r, 500));

    const success = login(email, password);
    if (success) {
      toast.success("Login berhasil!");
      router.push("/dashboard");
    } else {
      toast.error("Email atau password salah");
    }
    setLoading(false);
  };

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel kiri — logo besar di tengah */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#e8f5e9] via-white to-[#e3f2fd] flex-col items-center justify-center p-12">
        <BrandLogo size="hero" showTagline className="w-full" />
        <p className="mt-10 text-center text-sm text-muted-foreground max-w-sm">
          Dashboard Super Admin untuk mengelola mitra CSO, distribusi work
          order, dan bagi hasil secara real-time.
        </p>
        <p className="mt-8 text-xs text-muted-foreground">
          © 2025 GO KLIRR. All rights reserved.
        </p>
      </div>

      {/* Panel kanan — form login */}
      <div className="flex flex-1 items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <BrandLogo
              size="xl"
              showName
              showTagline
              className="mx-auto mb-2 lg:hidden"
            />
            <p className="hidden lg:block text-2xl font-bold text-[#2e7d32] tracking-wide">
              GO KLIRR
            </p>
            <p className="hidden lg:block text-sm text-[#1976d2] mb-2">
              Bersih Cepat, Hasil Tepat.
            </p>
            <CardTitle className="text-xl">Masuk sebagai Super Admin</CardTitle>
            <CardDescription>
              Masukkan kredensial Anda untuk mengakses dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="superadmin@wo-platform.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <div className="mt-4 rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Demo credentials:
              </p>
              <p className="text-xs font-mono">{DEMO_CREDENTIALS.email}</p>
              <p className="text-xs font-mono">{DEMO_CREDENTIALS.password}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={fillDemo}
                type="button"
              >
                Gunakan Akun Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
