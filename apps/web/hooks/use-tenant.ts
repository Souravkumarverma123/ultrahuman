import { useState, useEffect } from "react";

export function useTenant() {
  const [tenantId, setTenantId] = useState<string>("demo-user-1");

  useEffect(() => {
    const saved = localStorage.getItem("ultrahuman_tenant_id");
    if (saved) {
      setTenantId(saved);
    }
  }, []);

  const changeTenant = (id: string) => {
    localStorage.setItem("ultrahuman_tenant_id", id);
    setTenantId(id);
  };

  return {
    tenantId,
    changeTenant,
  };
}
