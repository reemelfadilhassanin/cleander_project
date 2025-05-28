import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User } from "lucide-react";

interface AdminRoleSelectorProps {
  isOpen: boolean;
  userName: string;
}

export function AdminRoleSelector({ isOpen, userName }: AdminRoleSelectorProps) {
  const [open, setOpen] = useState(isOpen);
  const [location, navigate] = useLocation();
  
  // إذا كان المستخدم بالفعل في صفحة المدير، فلا نعرض النافذة
  useEffect(() => {
    if (location.startsWith('/admin')) {
      setOpen(false);
    }
  }, [location]);

  const handleRoleSelect = (role: 'admin' | 'user') => {
    setOpen(false);
    // تأخير قليل لإتاحة وقت لإغلاق الحوار قبل الانتقال
    setTimeout(() => {
      navigate(role === 'admin' ? "/admin" : "/");
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">اختيار نوع الدخول</DialogTitle>
          <DialogDescription className="text-center text-lg">
            مرحباً {userName}، بصفتك مديرًا في النظام، يمكنك الدخول بأحد الصلاحيات التالية:
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          <Card 
            className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-center">
                <Shield className="h-16 w-16 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <h3 className="text-xl font-bold mb-2">دخول كمدير</h3>
              <CardDescription className="text-center">
                للوصول إلى لوحة التحكم وإدارة المستخدمين والإعدادات
              </CardDescription>
              <Button className="mt-4 w-full" onClick={() => handleRoleSelect('admin')}>
                الدخول كمدير
              </Button>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:shadow-md transition-all border-2 hover:border-primary"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-center">
                <User className="h-16 w-16 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <h3 className="text-xl font-bold mb-2">دخول كمستخدم</h3>
              <CardDescription className="text-center">
                للوصول إلى التقويم ومناسباتك الشخصية كمستخدم عادي
              </CardDescription>
              <Button className="mt-4 w-full" variant="outline" onClick={() => handleRoleSelect('user')}>
                الدخول كمستخدم
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}