// src/pages/SelectRolePage.tsx
import { AdminRoleSelector } from "@/components/adminroleselector";

export default function SelectRolePage() {
  return (
    <div>
      <AdminRoleSelector isOpen={true} userName="admin" />
    </div>
  );
}
