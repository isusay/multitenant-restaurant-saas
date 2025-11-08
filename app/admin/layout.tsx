import { redirect } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This is a server component, we'll handle auth checks on the client side
    // for better UX with proper loading states
    return (
        <div className="min-h-screen bg-background">
            <main>{children}</main>
        </div>
    );
}