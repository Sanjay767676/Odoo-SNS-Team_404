import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, User, Building2, Bell, Tag } from "lucide-react";

const discountCodes = [
  { code: "FIRST10", type: "Percentage", value: "10% off" },
  { code: "SAVE200", type: "Flat", value: "$200 off" },
  { code: "WELCOME15", type: "Percentage", value: "15% off" },
  { code: "FLAT500", type: "Flat", value: "$500 off" },
];

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [invoiceAlerts, setInvoiceAlerts] = useState(true);
  const [subscriptionAlerts, setSubscriptionAlerts] = useState(false);

  const handleSaveCompany = () => {
    toast({
      title: "Company settings saved",
      description: "Your company settings have been updated successfully.",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification preferences saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-settings-title">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and application preferences.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={user?.name || ""}
              readOnly
              className="bg-muted"
              data-testid="input-profile-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user?.email || ""}
              readOnly
              className="bg-muted"
              data-testid="input-profile-email"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Company Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              data-testid="input-company-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-color">Primary Brand Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="brand-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-16 h-9 p-1 cursor-pointer"
                data-testid="input-brand-color"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="flex-1"
                data-testid="input-brand-color-text"
              />
            </div>
          </div>
          <Button onClick={handleSaveCompany} data-testid="button-save-company">
            Save Company Settings
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive general email notifications</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
              data-testid="switch-email-notifications"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Invoice Alerts</Label>
              <p className="text-xs text-muted-foreground">Get notified about new and overdue invoices</p>
            </div>
            <Switch
              checked={invoiceAlerts}
              onCheckedChange={setInvoiceAlerts}
              data-testid="switch-invoice-alerts"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Subscription Alerts</Label>
              <p className="text-xs text-muted-foreground">Get notified about subscription changes</p>
            </div>
            <Switch
              checked={subscriptionAlerts}
              onCheckedChange={setSubscriptionAlerts}
              data-testid="switch-subscription-alerts"
            />
          </div>
          <Button onClick={handleSaveNotifications} data-testid="button-save-notifications">
            Save Notification Preferences
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Discount Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {discountCodes.map((discount) => (
              <div
                key={discount.code}
                className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                data-testid={`discount-row-${discount.code}`}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" data-testid={`badge-discount-${discount.code}`}>
                    {discount.code}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{discount.type}</span>
                </div>
                <span className="text-sm font-medium" data-testid={`text-discount-value-${discount.code}`}>
                  {discount.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
