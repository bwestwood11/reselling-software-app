import Link from "next/link";
import { Card, CardContent } from "@repo/ui";
import { Store, User, Bell, ChevronRight } from "lucide-react";

const settingsNav = [
  {
    href: "/settings/marketplaces",
    Icon: Store,
    label: "Marketplace Connections",
    description: "Connect and manage your marketplace accounts",
  },
  {
    href: "/settings/profile",
    Icon: User,
    label: "Profile",
    description: "Update your name, email, and password",
  },
  {
    href: "/settings/notifications",
    Icon: Bell,
    label: "Notifications",
    description: "Configure sync alerts and email preferences",
  },
];

export default function SettingsPage(): import("react").JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="space-y-3">
        {settingsNav.map(({ href, Icon, label, description }) => (
          <Card key={href} className="transition-shadow hover:shadow-sm">
            <CardContent className="p-0">
              <Link
                href={href}
                className="flex items-center gap-4 p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

