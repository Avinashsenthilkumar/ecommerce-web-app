import { AccessGate } from "@/components/AccessGate";
import { AdminProductManager } from "@/components/admin/AdminProductManager";
import { OpsShell, Section } from "@/components/OpsShell";
import { staffGate } from "@/lib/auth";
import { getAdminProductWorkspace } from "@/lib/services/admin-products";

export const metadata = { title: "Product catalogue — subsel admin" };

export default async function AdminProductsPage() {
  const { user, allowed } = await staffGate("ADMIN");
  if (!allowed) return <AccessGate need="ADMIN" user={user} />;
  const workspace = await getAdminProductWorkspace();

  return (
    <OpsShell
      title="Product catalogue"
      subtitle="Create and manage products, Cloudinary images, variants and stock"
      tabs={[]}
      active="/admin/products"
    >
      <Section title="Manage products" hint="Changes to active product details appear on the storefront immediately.">
        <div className="p-4 sm:p-5">
          <AdminProductManager
            products={workspace.products}
            categories={workspace.categories.map(({ id, name }) => ({ id, name }))}
            vendors={workspace.vendors}
            warehouses={workspace.warehouses}
          />
        </div>
      </Section>
    </OpsShell>
  );
}
